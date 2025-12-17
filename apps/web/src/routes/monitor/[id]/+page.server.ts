import { drizzle } from 'drizzle-orm/d1';
import { monitors, heartbeats, incidents, maintenance } from '../../../../../../packages/db/src/schema';
import { eq, desc, and, lt, gt } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
    if (!platform?.env?.DB) {
        throw error(500, 'Database not available');
    }

    const db = drizzle(platform.env.DB);
    const monitorId = params.id;

    // 1. Get Monitor Details
    const monitor = await db.select()
        .from(monitors)
        .where(eq(monitors.id, monitorId))
        .get();

    if (!monitor) {
        throw error(404, 'Monitor not found');
    }

    // 2. Get Recent Heartbeats (last 24h for sparkline)
    const now = Math.floor(Date.now() / 1000);
    const twentyFourHoursAgo = now - 24 * 60 * 60;

    const recentHeartbeats = await db.select()
        .from(heartbeats)
        .where(and(
            eq(heartbeats.monitorId, monitorId),
            gt(heartbeats.timestamp, twentyFourHoursAgo)
        ))
        .orderBy(heartbeats.timestamp)
        .all();

    // 3. Get Incident History
    const incidentHistory = await db.select()
        .from(incidents)
        .where(eq(incidents.monitorId, monitorId))
        .orderBy(desc(incidents.startedAt))
        .limit(50)
        .all();

    // 4. Get Maintenance History
    const maintenanceHistory = await db.select()
        .from(maintenance)
        .where(eq(maintenance.monitorId, monitorId))
        .orderBy(desc(maintenance.startTime))
        .limit(50)
        .all();

    // Calculate Uptime (24h)
    const totalHeartbeats = recentHeartbeats.length;
    const successHeartbeats = recentHeartbeats.filter(h => h.status >= 200 && h.status < 300).length;
    const uptime24h = totalHeartbeats > 0 
        ? ((successHeartbeats / totalHeartbeats) * 100).toFixed(2) 
        : '100.00';

    return {
        monitor,
        heartbeats: recentHeartbeats,
        incidents: incidentHistory,
        maintenance: maintenanceHistory,
        uptime24h,
        lang: locals?.lang || 'en'
    };
};
