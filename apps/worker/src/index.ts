import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, isNull, gt, lt, sql } from 'drizzle-orm';
import { monitors, heartbeats, incidents, maintenance, settings, hourlyStats } from '../../../packages/db/src/schema';
import { sendNotifications } from './lib/notifications';
import { t } from './lib/i18n';

// Helper: Chunk array into smaller batches
function chunk<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}

type Bindings = {
  DB: D1Database;
  DISCORD_WEBHOOK_URL?: string;
  NOTIFY_LANGUAGE?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// --- Basic API (For debugging or keep-alive) ---

app.get('/', (c) => c.text('LitePing Worker is running.'));

// Debug: View current monitor list
app.get('/api/status', async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select().from(monitors).all();
  return c.json(result);
});

// --- Core Cron Logic (Runs every minute) ---

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const db = drizzle(env.DB);

    // 1. Get all active monitors
    const targets = await db.select().from(monitors).where(eq(monitors.active, true)).all();

    if (targets.length === 0) {
      return;
    }

    // Detect current Worker location
    // Cron Trigger doesn't have request.cf, so we fetch Cloudflare trace
    let currentLocation = 'Global';
    try {
      const trace = await fetch('https://www.cloudflare.com/cdn-cgi/trace');
      const text = await trace.text();
      const match = text.match(/colo=([A-Z]+)/);
      if (match) {
        currentLocation = match[1];
      }
    } catch (e) {
      // Ignore location detection failure
    }

    // Get active maintenance windows
    const now = Math.floor(Date.now() / 1000);
    const activeMaintenances = await db.select()
      .from(maintenance)
      .where(and(lt(maintenance.startTime, now), gt(maintenance.endTime, now)))
      .all();

    const maintenanceSet = new Set(activeMaintenances.map(m => m.monitorId));

    // Pre-fetch all open incidents to avoid N+1 queries
    const openIncidents = await db.select()
      .from(incidents)
      .where(isNull(incidents.resolvedAt))
      .all();
    
    const openIncidentMap = new Map(openIncidents.map(i => [i.monitorId, i]));

    // 2. Execute Ping checks concurrently (Batched)
    const results = [];
    const batches = chunk(targets, 10);

    for (const batch of batches) {
      const batchResults = await Promise.all(batch.map(async (target) => {
      const start = Date.now();
      let status = 0;
      let errorMsg = '';

      try {
        // Simple Retry Logic (1 retry)
        for (let i = 0; i < 2; i++) {
          try {
            const response = await fetch(target.url, {
              method: target.method as string,
              signal: AbortSignal.timeout(10000), // 10s timeout
              headers: {
                'User-Agent': 'LitePing-Monitor/1.0 (Cloudflare Workers)',
                'Cache-Control': 'no-cache'
              }
            });
            status = response.status;
            // If success (2xx) or client error (4xx), break. Only retry on network error.
            break; 
          } catch (err) {
            if (i === 1) throw err; // Throw on last attempt
          }
        }
      } catch (e: any) {
        status = 0; // 0 represents network failure
        errorMsg = e.message || "Network Error";
      }

      const latency = Date.now() - start;
      const timestamp = Math.floor(Date.now() / 1000);

      // Determine if down (non-2xx status)
      const isDown = status < 200 || status >= 300;
      const isUnderMaintenance = maintenanceSet.has(target.id);

      // === Incident State Machine ===

      // Check for open incidents
      const openIncident = openIncidentMap.get(target.id);

      if (isDown) {
        // Case A: Currently Down
        if (!openIncident) {
          // Only create incident if NOT under maintenance
          if (!isUnderMaintenance) {
            await db.insert(incidents).values({
              id: crypto.randomUUID(),
              monitorId: target.id,
              url: target.url,
              cause: status === 0 ? errorMsg : `HTTP Status ${status}`,
              startedAt: timestamp,
              resolvedAt: null
            }).execute();

            // Send notification
            const lang = env.NOTIFY_LANGUAGE || 'zh-CN';
            const errorText = status === 0 ? errorMsg : `${t(lang, 'status')} ${status}`;

            ctx.waitUntil(
              sendNotifications(db, {
                title: t(lang, 'serviceDown', { name: target.name }),
                description: `**${t(lang, 'url')}:** ${target.url}\n**${t(lang, 'error')}:** ${errorText}`,
                status: 'DOWN'
              })
            );
          }
        }
      } else {
        // Case B: Currently Up
        if (openIncident) {
          // Resolved
          await db.update(incidents)
            .set({ resolvedAt: timestamp })
            .where(eq(incidents.id, openIncident.id))
            .execute();

          // Send recovery notification
          if (openIncident) {
            const downtimeMins = Math.ceil((timestamp - openIncident.startedAt) / 60);
            const lang = env.NOTIFY_LANGUAGE || 'zh-CN';

            ctx.waitUntil(
              sendNotifications(db, {
                title: t(lang, 'serviceRecovered', { name: target.name }),
                description: `**${t(lang, 'url')}:** ${target.url}\n**${t(lang, 'downtime')}:** ~${downtimeMins} ${t(lang, 'mins')}`,
                status: 'UP'
              })
            );
          }
        }
      }

      return {
        monitorId: target.id,
        status: status,
        latency: latency,
        timestamp: timestamp,
        region: currentLocation,
      };
    }));
    results.push(...batchResults);
    }

    // 3. Batch insert heartbeats (Chunked)
    if (results.length > 0) {
      const batches = chunk(results, 50);
      for (const batch of batches) {
        await db.insert(heartbeats).values(batch).execute();
      }
    }

    // 4. Data Retention & Aggregation
    // Run once a day at 00:00 UTC
    const date = new Date(event.scheduledTime);
    if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
      ctx.waitUntil((async () => {
        try {
          // A. Get retention settings (default 30 days)
          const settingsList = await db.select().from(settings).where(eq(settings.key, 'retention_days')).all();
          const retentionDays = settingsList.length > 0 ? parseInt(settingsList[0].value) : 30;
          
          // B. Aggregate data older than 24h into hourly_stats
          // Target window: 24h ago to 48h ago (yesterday)
          const now = Math.floor(Date.now() / 1000);
          const oneDayAgo = now - 86400;
          const twoDaysAgo = now - (2 * 86400);

          // We aggregate hour by hour for the past day
          // This is a bit heavy, but D1 is fast enough for this volume
          // Query: Group by monitor_id and hour
          const aggregationQuery = sql`
            INSERT INTO hourly_stats (monitor_id, timestamp, avg_latency, success_count, total_count)
            SELECT 
              monitor_id,
              (timestamp / 3600) * 3600 as hour_start,
              CAST(AVG(latency) AS INTEGER) as avg_latency,
              SUM(CASE WHEN status >= 200 AND status < 300 THEN 1 ELSE 0 END) as success_count,
              COUNT(*) as total_count
            FROM heartbeats
            WHERE timestamp >= ${twoDaysAgo} AND timestamp < ${oneDayAgo}
            GROUP BY monitor_id, hour_start
          `;
          await db.run(aggregationQuery);

          // C. Cleanup raw data older than retention period
          const retentionTimestamp = now - (retentionDays * 86400);
          await db.delete(heartbeats)
            .where(lt(heartbeats.timestamp, retentionTimestamp))
            .execute();

        } catch (err) {
          console.error('Daily maintenance failed', err);
        }
      })());
    }
  },
};