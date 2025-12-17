import { drizzle } from 'drizzle-orm/d1';
import { monitors, heartbeats, announcements, maintenance, notifiers, settings, incidents } from '../../../../../packages/db/src/schema';
import { desc, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

// --- 1. 读取数据 ---
export const load: PageServerLoad = async ({ platform, cookies, url }) => {
  const session = cookies.get('liteping_session');
  if (session !== env.ADMIN_PASSWORD) {
    throw redirect(303, `/login?redirectTo=${url.pathname}`);
  }

  if (!platform?.env?.DB) {
    console.error("Admin Load Error: No DB binding found.");
    return { monitors: [], globalAnnouncements: [], incidents: [], maintenance: [] };
  }

  const db = drizzle(platform.env.DB);

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

    // Load settings
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
      settings: settingsMap
    };
  } catch (e) {
    console.error("Admin Load Error:", e);
    return { monitors: [], globalAnnouncements: [], incidents: [], maintenance: [] };
  }
};

// --- 2. 增删改查逻辑 ---
export const actions = {
  // 创建
  create: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) {
      return fail(401, { message: "Unauthorized" });
    }

    if (!platform?.env?.DB) return fail(500, { message: "No DB" });
    
    try {
      const formData = await request.formData();
      const name = formData.get('name') as string;
      const url = formData.get('url') as string;
      const method = (formData.get('method') as string) || 'HEAD';

      if (!name || !url) return fail(400, { message: "Missing fields" });

      const db = drizzle(platform.env.DB);
      await db.insert(monitors).values({
        id: crypto.randomUUID(),
        name,
        url,
        method: method as any,
        active: true,
        interval: 60,
        createdAt: Math.floor(Date.now() / 1000)
      }).execute();
      return { success: true };
    } catch (e: any) {
      console.error("Create Failed:", e);
      return fail(500, { message: e.message || "Failed to create monitor" });
    }
  },

  // 删除
  delete: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) {
      return fail(401, { message: "Unauthorized" });
    }

    if (!platform?.env?.DB) return fail(500, { message: "No DB" });
    
    try {
      const formData = await request.formData();
      const id = formData.get('id') as string;

      if (!id) return fail(400, { message: "Missing ID" });

      const db = drizzle(platform.env.DB);
      await db.delete(heartbeats).where(eq(heartbeats.monitorId, id)).execute();
      await db.delete(monitors).where(eq(monitors.id, id)).execute();
      return { success: true };
    } catch (e: any) {
      console.error("Delete Failed:", e);
      return fail(500, { message: e.message || "Failed to delete monitor" });
    }
  },

  // 更新
  update: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) {
      return fail(401, { message: "Unauthorized" });
    }

    if (!platform?.env?.DB) return fail(500, { message: "No DB" });

    try {
      const formData = await request.formData();

      const id = formData.get('id') as string;
      const name = formData.get('name') as string;
      const url = formData.get('url') as string;
      const method = formData.get('method') as string;
      const active = formData.get('active') === 'on';

      if (!id || !url || !name) {
        return fail(400, { message: "Missing fields" });
      }

      const db = drizzle(platform.env.DB);
      await db.update(monitors)
        .set({ name, url, method: method as any, active })
        .where(eq(monitors.id, id))
        .execute();

      return { success: true };
    } catch (e: any) {
      console.error("Update Failed:", e);
      return fail(500, { message: e.message });
    }
  },

  // 导入
  import: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) {
      return fail(401, { message: "Unauthorized" });
    }

    if (!platform?.env?.DB) return fail(500);
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || file.size === 0) return fail(400);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return fail(400);

      const db = drizzle(platform.env.DB);
      let count = 0;

      for (const item of data) {
        if (!item.name || !item.url) continue;
        await db.insert(monitors).values({
          id: crypto.randomUUID(),
          name: item.name,
          url: item.url,
          method: item.method || 'HEAD',
          active: item.active !== false,
          interval: item.interval || 60,
          createdAt: Math.floor(Date.now() / 1000)
        }).execute();
        count++;
      }

      return { success: true, count };
    } catch (e) {
      console.error("Import failed", e);
      return fail(500);
    }
  },

  // 公告创建
  create_announcement: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) {
      return fail(401, { message: "Unauthorized" });
    }

    if (!platform?.env?.DB) return fail(500);
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const type = (formData.get('type') as string) || 'info';

    if (!title) return fail(400);

    const db = drizzle(platform.env.DB);
    await db.insert(announcements).values({
      id: crypto.randomUUID(),
      title,
      type,
      active: true,
      createdAt: Math.floor(Date.now() / 1000)
    }).execute();
    return { success: true };
  },

  // 公告删除
  delete_announcement: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) {
      return fail(401, { message: "Unauthorized" });
    }

    if (!platform?.env?.DB) return fail(500);
    const formData = await request.formData();
    const id = formData.get('id') as string;

    const db = drizzle(platform.env.DB);
    await db.delete(announcements).where(eq(announcements.id, id)).execute();
    return { success: true };
  },



  // 创建通知渠道
  create_notifier: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) {
      return fail(401, { message: "Unauthorized" });
    }

    if (!platform?.env?.DB) return fail(500);
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const webhookUrl = formData.get('webhookUrl') as string;
    const telegramToken = formData.get('telegramToken') as string;
    const telegramChatId = formData.get('telegramChatId') as string;

    if (!name || !type) return fail(400, { message: 'Name and type required' });

    let config: any = {};
    if (type === 'telegram') {
      if (!telegramToken || !telegramChatId) return fail(400, { message: 'Telegram token and chat ID required' });
      config = { token: telegramToken, chatId: telegramChatId };
    } else {
      if (!webhookUrl) return fail(400, { message: 'Webhook URL required' });
      config = { webhookUrl };
    }

    const db = drizzle(platform.env.DB);
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

  // 删除通知渠道
  delete_notifier: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) {
      return fail(401, { message: "Unauthorized" });
    }

    if (!platform?.env?.DB) return fail(500);
    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) return fail(400);

    const db = drizzle(platform.env.DB);
    await db.delete(notifiers).where(eq(notifiers.id, id)).execute();
    return { success: true };
  },

  // 更新通知渠道
  update_notifier: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) {
      return fail(401, { message: "Unauthorized" });
    }

    if (!platform?.env?.DB) return fail(500);
    const formData = await request.formData();

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;

    let config: any = {};
    if (type === 'discord' || type === 'slack' || type === 'webhook') {
      config = { webhookUrl: formData.get('url') };
    } else if (type === 'telegram') {
      config = { token: formData.get('token'), chatId: formData.get('chat_id') };
    }

    if (!id || !name) {
      return fail(400, { message: "Missing fields" });
    }

    const db = drizzle(platform.env.DB);
    await db.update(notifiers)
      .set({
        name,
        type,
        config: JSON.stringify(config),
      })
      .where(eq(notifiers.id, id))
      .execute();

    return { success: true };
  },

  // 登出
  logout: async ({ cookies }) => {
    cookies.delete('liteping_session', { path: '/' });
    throw redirect(303, '/login');
  },

  // 批量操作
  batch_action: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) return fail(401);
    if (!platform?.env?.DB) return fail(500);

    const formData = await request.formData();
    const action = formData.get('action') as string;
    const ids = (formData.get('ids') as string).split(',');

    if (!ids.length) return fail(400);

    const db = drizzle(platform.env.DB);

    try {
      if (action === 'delete') {
        for (const id of ids) {
          await db.delete(heartbeats).where(eq(heartbeats.monitorId, id)).execute();
          await db.delete(monitors).where(eq(monitors.id, id)).execute();
        }
      } else if (action === 'pause') {
        for (const id of ids) {
          await db.update(monitors).set({ active: false }).where(eq(monitors.id, id)).execute();
        }
      } else if (action === 'resume') {
        for (const id of ids) {
          await db.update(monitors).set({ active: true }).where(eq(monitors.id, id)).execute();
        }
      }
      return { success: true };
    } catch (e) {
      console.error("Batch Action Failed:", e);
      return fail(500);
    }
  },

  // 保存排序
  save_order: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) return fail(401);
    if (!platform?.env?.DB) return fail(500);

    const formData = await request.formData();
    const orderData = JSON.parse(formData.get('order') as string); // [{id, weight}]

    const db = drizzle(platform.env.DB);
    try {
      for (const item of orderData) {
        await db.update(monitors).set({ weight: item.weight }).where(eq(monitors.id, item.id)).execute();
      }
      return { success: true };
    } catch (e) {
      console.error("Save Order Failed:", e);
      return fail(500);
    }
  },

  // 更新设置
  update_settings: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) return fail(401);
    if (!platform?.env?.DB) return fail(500);

    const formData = await request.formData();
    const retentionDays = formData.get('retention_days') as string;
    const siteTitle = formData.get('site_title') as string;
    const siteDesc = formData.get('site_desc') as string;
    const footerText = formData.get('footer_text') as string;

    if (!retentionDays) return fail(400);

    const db = drizzle(platform.env.DB);
    try {
      // Upsert retention_days
      await db.insert(settings)
        .values({ key: 'retention_days', value: retentionDays })
        .onConflictDoUpdate({ target: settings.key, set: { value: retentionDays } })
        .execute();

      // Upsert site_title
      if (siteTitle !== null) {
        await db.insert(settings)
          .values({ key: 'site_title', value: siteTitle })
          .onConflictDoUpdate({ target: settings.key, set: { value: siteTitle } })
          .execute();
      }

      // Upsert site_desc
      if (siteDesc !== null) {
        await db.insert(settings)
          .values({ key: 'site_desc', value: siteDesc })
          .onConflictDoUpdate({ target: settings.key, set: { value: siteDesc } })
          .execute();
      }

      // Upsert footer_text
      if (footerText !== null) {
        await db.insert(settings)
          .values({ key: 'footer_text', value: footerText })
          .onConflictDoUpdate({ target: settings.key, set: { value: footerText } })
          .execute();
      }
      
      return { success: true };
    } catch (e) {
      console.error("Update Settings Failed:", e);
      return fail(500);
    }
  },

  // --- Maintenance Actions ---
  create_maintenance: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) return fail(401);
    if (!platform?.env?.DB) return fail(500);

    const formData = await request.formData();
    const monitorId = formData.get('monitor_id') as string;
    const title = formData.get('title') as string;
    const startTime = formData.get('start_time') as string; // ISO string
    const endTime = formData.get('end_time') as string; // ISO string

    if (!monitorId || !title || !startTime || !endTime) return fail(400);

    const db = drizzle(platform.env.DB);
    try {
      await db.insert(maintenance).values({
        id: crypto.randomUUID(),
        monitorId,
        title,
        startTime: Math.floor(new Date(startTime).getTime() / 1000),
        endTime: Math.floor(new Date(endTime).getTime() / 1000),
        createdAt: Math.floor(Date.now() / 1000)
      }).execute();
      return { success: true };
    } catch (e) {
      console.error("Create Maintenance Failed:", e);
      return fail(500);
    }
  },

  delete_maintenance: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) return fail(401);
    if (!platform?.env?.DB) return fail(500);

    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) return fail(400);

    const db = drizzle(platform.env.DB);
    try {
      await db.delete(maintenance).where(eq(maintenance.id, id)).execute();
      return { success: true };
    } catch (e) {
      console.error("Delete Maintenance Failed:", e);
      return fail(500);
    }
  },

  // --- Incident Actions ---
  update_incident: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) return fail(401);
    if (!platform?.env?.DB) return fail(500);

    const formData = await request.formData();
    const id = formData.get('id') as string;
    const cause = formData.get('cause') as string;

    if (!id || !cause) return fail(400);

    const db = drizzle(platform.env.DB);
    try {
      await db.update(incidents)
        .set({ cause })
        .where(eq(incidents.id, id))
        .execute();

      return { success: true };
    } catch (e) {
      console.error("Update Incident Failed:", e);
      return fail(500);
    }
  },

  resolve_incident: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) return fail(401);
    if (!platform?.env?.DB) return fail(500);

    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) return fail(400);

    const db = drizzle(platform.env.DB);
    try {
      await db.update(incidents)
        .set({ resolvedAt: Math.floor(Date.now() / 1000) })
        .where(eq(incidents.id, id))
        .execute();
      return { success: true };
    } catch (e) {
      console.error("Resolve Incident Failed:", e);
      return fail(500);
    }
  },

  delete_incident: async ({ request, platform, cookies }) => {
    const session = cookies.get('liteping_session');
    if (session !== env.ADMIN_PASSWORD) return fail(401);
    if (!platform?.env?.DB) return fail(500);

    const formData = await request.formData();
    const id = formData.get('id') as string;

    if (!id) return fail(400);

    const db = drizzle(platform.env.DB);
    try {
      await db.delete(incidents).where(eq(incidents.id, id)).execute();
      return { success: true };
    } catch (e) {
      console.error("Delete Incident Failed:", e);
      return fail(500);
    }
  }
};
