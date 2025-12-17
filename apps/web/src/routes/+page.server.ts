import { drizzle } from 'drizzle-orm/d1';
import { monitors, heartbeats, incidents, announcements, maintenance } from '../../../../packages/db/src/schema';
import { desc, eq, and, lt, gt, isNull } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
    // 1. 定义默认空数据 (保底)
    const defaultData = {
        lang: locals?.lang || 'en',
        monitors: [],
        maintenanceHistory: [],
        globalAnnouncements: [],
        incidents: []
    };

    // 如果没有 DB 环境 (比如本地没连上)，直接返回空数据
    if (!platform?.env?.DB) {
        console.warn("⚠️ No DB connection found.");
        return defaultData;
    }

    try {
        const db = drizzle(platform.env.DB);
        const now = Math.floor(Date.now() / 1000);

        // --- A. 查询监控目标 ---
        const allMonitors = await db.select()
            .from(monitors)
            .orderBy(desc(monitors.weight), desc(monitors.createdAt))
            .all()
            .catch(e => {
            console.error("Failed to load monitors:", e);
            return [];
        });

        // --- B. 查询当前活跃维护 (用于状态灯) ---
        const activeMaintenances = await db.select()
            .from(maintenance)
            .where(and(lt(maintenance.startTime, now), gt(maintenance.endTime, now)))
            .all()
            .catch(() => []);

        const maintenanceMap = new Map(activeMaintenances.map(m => [m.monitorId, m]));

        // --- Pre-fetch Active Incidents (Optimization) ---
        const activeIncidents = await db.select()
            .from(incidents)
            .where(isNull(incidents.resolvedAt))
            .all()
            .catch(() => []);
        
        const incidentMap = new Map(activeIncidents.map(i => [i.monitorId, i]));

        // --- C. 组装心跳数据 ---
        const monitorsWithHeartbeats = await Promise.all(allMonitors.map(async (m) => {
            try {
                // 查状态统计 (24h)
                const uptimeStats = await db.select({ status: heartbeats.status })
                    .from(heartbeats)
                    .where(eq(heartbeats.monitorId, m.id))
                    .orderBy(desc(heartbeats.timestamp))
                    .limit(1440)
                    .all();

                // 查绘图数据 (30条)
                const recentHeartbeats = await db.select({
                    latency: heartbeats.latency,
                    status: heartbeats.status,
                    timestamp: heartbeats.timestamp,
                    region: heartbeats.region
                })
                    .from(heartbeats)
                    .where(eq(heartbeats.monitorId, m.id))
                    .orderBy(desc(heartbeats.timestamp))
                    .limit(30)
                    .all();

                // 查当前事故 (Use pre-fetched map)
                const currentIncident = incidentMap.get(m.id) || null;

                return {
                    ...m,
                    pulseline: recentHeartbeats.reverse(),
                    uptimeStats: uptimeStats || [],
                    currentIncident,
                    currentMaintenance: maintenanceMap.get(m.id) || null
                };
            } catch (err) {
                // 单个监控项失败不影响整体
                console.error(`Failed to load data for monitor ${m.id}`, err);
                return { ...m, pulseline: [], uptimeStats: [], currentIncident: null, currentMaintenance: null };
            }
        }));

        // --- D. 查询辅助数据 (维护历史、公告、事故) ---
        const maintenanceHistory = await db.select()
            .from(maintenance)
            .orderBy(desc(maintenance.startTime))
            .limit(50)
            .all()
            .catch(() => []);

        const globalAnnouncements = await db.select()
            .from(announcements)
            .where(eq(announcements.active, true))
            .orderBy(desc(announcements.createdAt))
            .all()
            .catch(() => []);

        const allIncidents = await db.select()
            .from(incidents)
            .orderBy(desc(incidents.startedAt))
            .limit(50)
            .all()
            .catch(() => []);

        // 2. 返回完整数据
        return {
            lang: locals?.lang || 'en',
            monitors: monitorsWithHeartbeats,
            maintenanceHistory,
            globalAnnouncements,
            incidents: allIncidents
        };

    } catch (globalError) {
        // 3. 终极捕获：如果上面发生了不可预知的灾难，返回默认空数据，保证页面不崩 500
        console.error("🔥 CRITICAL LOAD ERROR:", globalError);
        return defaultData;
    }
};