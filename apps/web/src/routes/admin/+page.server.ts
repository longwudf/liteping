import { drizzle } from 'drizzle-orm/d1';
import {
  announcements,
  heartbeats,
  hourlyStats,
  incidents,
  maintenance,
  monitors,
  notifiers,
  settings
} from '../../../../../packages/db/src/schema';
import { desc, eq } from 'drizzle-orm';
import { fail, redirect, type Cookies } from '@sveltejs/kit';
import { clearAdminSessionCookie, createCsrfToken, isAdminAuthenticated, verifyCsrfToken } from '$lib/server/auth';
import {
  assertMaintenanceWindow,
  isRecord,
  normalizeAnnouncementType,
  normalizeNotifierType,
  normalizeRetentionDays,
  normalizeWebhookUrl,
  parseMonitorInput,
  parseUnixTimestamp,
  stringValue
} from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';

type Database = ReturnType<typeof drizzle>;

const defaultData = {
  monitors: [],
  globalAnnouncements: [],
  maintenance: [],
  incidents: [],
  notifiers: [],
  settings: {}
};

export const load: PageServerLoad = async ({ platform, cookies, url }) => {
  if (!(await isAdminAuthenticated(cookies))) {
    throw redirect(303, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
  }

  const csrfToken = createCsrfToken(cookies, url.protocol === 'https:');

  const db = getDb(platform);
  if (!db) {
    console.error('Admin Load Error: No DB binding found.');
    return { ...defaultData, csrfToken };
  }

  try {
    const allMonitors = await db.select()
      .from(monitors)
      .orderBy(desc(monitors.weight), desc(monitors.createdAt))
      .all();

    const globalAnnouncements = await db.select()
      .from(announcements)
      .where(eq(announcements.active, true))
      .orderBy(desc(announcements.createdAt))
      .all();

    const maintenanceList = await db.select()
      .from(maintenance)
      .orderBy(desc(maintenance.startTime))
      .limit(20)
      .all();

    const incidentList = await db.select()
      .from(incidents)
      .orderBy(desc(incidents.startedAt))
      .limit(20)
      .all();

    const notifierList = await db.select()
      .from(notifiers)
      .orderBy(desc(notifiers.createdAt))
      .all();

    const settingsList = await db.select().from(settings).all();
    const settingsMap = settingsList.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string>);

    return {
      monitors: allMonitors,
      globalAnnouncements,
      maintenance: maintenanceList,
      incidents: incidentList,
      notifiers: notifierList,
      settings: settingsMap,
      csrfToken
    };
  } catch (e) {
    console.error('Admin Load Error:', e);
    return { ...defaultData, csrfToken };
  }
};

export const actions: Actions = {
  create: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    let monitorInput;

    try {
      monitorInput = parseMonitorInput({
        name: formData.get('name'),
        url: formData.get('url'),
        method: formData.get('method'),
        active: true
      });
    } catch (e) {
      return badRequest(e);
    }

    try {
      await db.insert(monitors).values({
        id: crypto.randomUUID(),
        ...monitorInput,
        createdAt: Math.floor(Date.now() / 1000)
      }).execute();

      return { success: true };
    } catch (e) {
      console.error('Create Failed:', e);
      return fail(500, { message: 'Failed to create monitor' });
    }
  },

  delete: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const id = stringValue(formData.get('id')).trim();
    if (!id) return fail(400, { message: 'Missing ID' });

    try {
      await deleteMonitorCascade(db, id);
      return { success: true };
    } catch (e) {
      console.error('Delete Failed:', e);
      return fail(500, { message: 'Failed to delete monitor' });
    }
  },

  update: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const id = stringValue(formData.get('id')).trim();
    if (!id) return fail(400, { message: 'Missing ID' });

    let monitorInput;
    try {
      monitorInput = parseMonitorInput({
        name: formData.get('name'),
        url: formData.get('url'),
        method: formData.get('method'),
        active: formData.get('active') === 'on'
      });
    } catch (e) {
      return badRequest(e);
    }

    try {
      await db.update(monitors)
        .set(monitorInput)
        .where(eq(monitors.id, id))
        .execute();

      return { success: true };
    } catch (e) {
      console.error('Update Failed:', e);
      return fail(500, { message: 'Failed to update monitor' });
    }
  },

  import: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) return fail(400, { message: 'Missing import file' });

    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) return fail(400, { message: 'Backup file must be an array' });

      let count = 0;
      for (const item of data) {
        if (!isRecord(item)) continue;

        try {
          const monitorInput = parseMonitorInput({
            name: item.name,
            url: item.url,
            method: item.method,
            interval: item.interval,
            active: item.active
          });

          await db.insert(monitors).values({
            id: crypto.randomUUID(),
            ...monitorInput,
            createdAt: Math.floor(Date.now() / 1000)
          }).execute();
          count += 1;
        } catch (e) {
          console.warn('Skipped invalid monitor during import:', e);
        }
      }

      return { success: true, count };
    } catch (e) {
      console.error('Import failed:', e);
      return fail(400, { message: 'Invalid backup file' });
    }
  },

  create_announcement: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const title = stringValue(formData.get('title')).trim();
    const message = stringValue(formData.get('message')).trim();

    if (!title) return fail(400, { message: 'Title is required' });

    try {
      await db.insert(announcements).values({
        id: crypto.randomUUID(),
        title,
        message: message || null,
        type: normalizeAnnouncementType(formData.get('type')),
        active: true,
        createdAt: Math.floor(Date.now() / 1000)
      }).execute();

      return { success: true };
    } catch (e) {
      console.error('Create Announcement Failed:', e);
      return fail(500, { message: 'Failed to create announcement' });
    }
  },

  delete_announcement: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const id = stringValue(formData.get('id')).trim();
    if (!id) return fail(400, { message: 'Missing ID' });

    await db.delete(announcements).where(eq(announcements.id, id)).execute();
    return { success: true };
  },

  create_notifier: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const name = stringValue(formData.get('name')).trim();
    if (!name) return fail(400, { message: 'Name is required' });

    let type;
    let config: Record<string, string>;
    try {
      type = normalizeNotifierType(formData.get('type'));
      config = buildNotifierConfig(type, formData, 'create');
    } catch (e) {
      return badRequest(e);
    }

    await db.insert(notifiers).values({
      id: crypto.randomUUID(),
      name,
      type,
      config: JSON.stringify(config),
      active: true,
      createdAt: Math.floor(Date.now() / 1000)
    }).execute();

    return { success: true };
  },

  delete_notifier: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const id = stringValue(formData.get('id')).trim();
    if (!id) return fail(400, { message: 'Missing ID' });

    await db.delete(notifiers).where(eq(notifiers.id, id)).execute();
    return { success: true };
  },

  update_notifier: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const id = stringValue(formData.get('id')).trim();
    const name = stringValue(formData.get('name')).trim();
    if (!id || !name) return fail(400, { message: 'Missing fields' });

    let type;
    let config: Record<string, string>;
    try {
      type = normalizeNotifierType(formData.get('type'));
      config = buildNotifierConfig(type, formData, 'update');
    } catch (e) {
      return badRequest(e);
    }

    await db.update(notifiers)
      .set({ name, type, config: JSON.stringify(config) })
      .where(eq(notifiers.id, id))
      .execute();

    return { success: true };
  },

  logout: async ({ request, cookies }) => {
    const formData = await request.formData();
    const authFailure = await requireActionAuth(cookies, formData);
    if (authFailure) return authFailure;

    clearAdminSessionCookie(cookies);
    throw redirect(303, '/login');
  },

  batch_action: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const action = stringValue(formData.get('action')).trim();
    const ids = parseIds(formData.get('ids'));
    if (ids.length === 0) return fail(400, { message: 'No monitors selected' });

    try {
      if (action === 'delete') {
        for (const id of ids) await deleteMonitorCascade(db, id);
      } else if (action === 'pause') {
        for (const id of ids) {
          await db.update(monitors).set({ active: false }).where(eq(monitors.id, id)).execute();
        }
      } else if (action === 'resume') {
        for (const id of ids) {
          await db.update(monitors).set({ active: true }).where(eq(monitors.id, id)).execute();
        }
      } else {
        return fail(400, { message: 'Unsupported batch action' });
      }

      return { success: true };
    } catch (e) {
      console.error('Batch Action Failed:', e);
      return fail(500, { message: 'Batch action failed' });
    }
  },

  save_order: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    let orderData: { id: string; weight: number }[];

    try {
      const parsed = JSON.parse(stringValue(formData.get('order')));
      if (!Array.isArray(parsed)) throw new Error('Order payload must be an array');

      orderData = parsed.map((item) => {
        if (!isRecord(item)) throw new Error('Invalid order item');
        const id = stringValue(item.id).trim();
        const weight = Number(item.weight);
        if (!id || !Number.isInteger(weight)) throw new Error('Invalid order item');
        return { id, weight };
      });
    } catch (e) {
      return badRequest(e);
    }

    try {
      for (const item of orderData) {
        await db.update(monitors).set({ weight: item.weight }).where(eq(monitors.id, item.id)).execute();
      }

      return { success: true };
    } catch (e) {
      console.error('Save Order Failed:', e);
      return fail(500, { message: 'Failed to save order' });
    }
  },

  update_settings: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    let retentionDays;

    try {
      retentionDays = normalizeRetentionDays(formData.get('retention_days'));
    } catch (e) {
      return badRequest(e);
    }

    try {
      await upsertSetting(db, 'retention_days', retentionDays);
      await upsertSetting(db, 'site_title', stringValue(formData.get('site_title')));
      await upsertSetting(db, 'site_desc', stringValue(formData.get('site_desc')));
      await upsertSetting(db, 'footer_text', stringValue(formData.get('footer_text')));

      return { success: true };
    } catch (e) {
      console.error('Update Settings Failed:', e);
      return fail(500, { message: 'Failed to update settings' });
    }
  },

  create_maintenance: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const monitorId = stringValue(formData.get('monitor_id')).trim();
    const title = stringValue(formData.get('title')).trim();

    if (!monitorId || !title) return fail(400, { message: 'Missing fields' });

    let startTime;
    let endTime;
    try {
      startTime = parseUnixTimestamp(formData.get('start_time'), 'Start time');
      endTime = parseUnixTimestamp(formData.get('end_time'), 'End time');
      assertMaintenanceWindow(startTime, endTime);
    } catch (e) {
      return badRequest(e);
    }

    try {
      const monitor = await db.select({ id: monitors.id })
        .from(monitors)
        .where(eq(monitors.id, monitorId))
        .get();

      if (!monitor) return fail(400, { message: 'Monitor not found' });

      await db.insert(maintenance).values({
        id: crypto.randomUUID(),
        monitorId,
        title,
        startTime,
        endTime,
        createdAt: Math.floor(Date.now() / 1000)
      }).execute();

      return { success: true };
    } catch (e) {
      console.error('Create Maintenance Failed:', e);
      return fail(500, { message: 'Failed to create maintenance window' });
    }
  },

  delete_maintenance: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const id = stringValue(formData.get('id')).trim();
    if (!id) return fail(400, { message: 'Missing ID' });

    await db.delete(maintenance).where(eq(maintenance.id, id)).execute();
    return { success: true };
  },

  update_incident: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const id = stringValue(formData.get('id')).trim();
    const cause = stringValue(formData.get('cause')).trim();
    if (!id || !cause) return fail(400, { message: 'Missing fields' });

    await db.update(incidents).set({ cause }).where(eq(incidents.id, id)).execute();
    return { success: true };
  },

  resolve_incident: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const id = stringValue(formData.get('id')).trim();
    if (!id) return fail(400, { message: 'Missing ID' });

    await db.update(incidents)
      .set({ resolvedAt: Math.floor(Date.now() / 1000) })
      .where(eq(incidents.id, id))
      .execute();

    return { success: true };
  },

  delete_incident: async ({ request, platform, cookies }) => {
    const { db, formData, failure } = await getActionContext(request, platform, cookies);
    if (failure) return failure;

    const id = stringValue(formData.get('id')).trim();
    if (!id) return fail(400, { message: 'Missing ID' });

    await db.delete(incidents).where(eq(incidents.id, id)).execute();
    return { success: true };
  }
};

function getDb(platform: App.Platform | undefined) {
  return platform?.env?.DB ? drizzle(platform.env.DB) : null;
}

async function getActionContext(request: Request, platform: App.Platform | undefined, cookies: Cookies) {
  const formData = await request.formData();
  const authFailure = await requireActionAuth(cookies, formData);
  if (authFailure) {
    return { formData, db: null, failure: authFailure };
  }

  const db = getDb(platform);
  if (!db) {
    return { formData, db: null, failure: fail(500, { message: 'No DB' }) };
  }

  return { formData, db, failure: null };
}

async function requireActionAuth(cookies: Cookies, formData: FormData) {
  if (await isAdminAuthenticated(cookies)) {
    if (verifyCsrfToken(cookies, formData)) {
      return null;
    }

    return fail(403, { message: 'Invalid CSRF token' });
  }

  return fail(401, { message: 'Unauthorized' });
}

function badRequest(error: unknown) {
  return fail(400, { message: error instanceof Error ? error.message : 'Bad request' });
}

function parseIds(value: FormDataEntryValue | null) {
  return stringValue(value)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

async function deleteMonitorCascade(db: Database, id: string) {
  await db.delete(hourlyStats).where(eq(hourlyStats.monitorId, id)).execute();
  await db.delete(heartbeats).where(eq(heartbeats.monitorId, id)).execute();
  await db.delete(incidents).where(eq(incidents.monitorId, id)).execute();
  await db.delete(maintenance).where(eq(maintenance.monitorId, id)).execute();
  await db.delete(monitors).where(eq(monitors.id, id)).execute();
}

async function upsertSetting(db: Database, key: string, value: string) {
  await db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .execute();
}

function buildNotifierConfig(type: string, formData: FormData, mode: 'create' | 'update'): Record<string, string> {
  if (type === 'telegram') {
    const token = stringValue(formData.get(mode === 'create' ? 'telegramToken' : 'token')).trim();
    const chatId = stringValue(formData.get(mode === 'create' ? 'telegramChatId' : 'chat_id')).trim();

    if (!token || !chatId) {
      throw new Error('Telegram token and chat ID are required');
    }

    return { token, chatId };
  }

  return { webhookUrl: normalizeWebhookUrl(formData.get(mode === 'create' ? 'webhookUrl' : 'url')) };
}
