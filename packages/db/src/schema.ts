import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const monitors = sqliteTable("monitors", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    method: text("method", { enum: ["GET", "HEAD", "POST"] }).default("HEAD"),
    interval: integer("interval").default(60),
    active: integer("active", { mode: "boolean" }).default(true),
    weight: integer("weight").default(0),
    createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const heartbeats = sqliteTable("heartbeats", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    monitorId: text("monitor_id")
        .notNull()
        .references(() => monitors.id),
    status: integer("status").notNull(),
    latency: integer("latency").notNull(),
    timestamp: integer("timestamp").notNull(),
    region: text("region").default("Global"),
}, (table) => {
    return {
        idxMonitorTimestamp: index("idx_monitor_timestamp").on(table.monitorId, table.timestamp),
    };
});

export const incidents = sqliteTable('incidents', {
    id: text('id').primaryKey(),
    monitorId: text('monitor_id').notNull(),
    url: text('url').notNull(),
    cause: text('cause').notNull(),
    startedAt: integer('started_at').notNull(),
    resolvedAt: integer('resolved_at'),
});

export const announcements = sqliteTable('announcements', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    message: text('message'),
    type: text('type').default('info'), // info, warning, alert
    active: integer('active', { mode: 'boolean' }).default(true),
    createdAt: integer('created_at').notNull(),
});

export const maintenance = sqliteTable('maintenance', {
    id: text('id').primaryKey(),
    monitorId: text('monitor_id').notNull(),
    title: text('title').notNull(),
    startTime: integer('start_time').notNull(),
    endTime: integer('end_time').notNull(),
    createdAt: integer('created_at').notNull(),
});

export const notifiers = sqliteTable('notifiers', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'discord', 'telegram', 'slack', 'webhook'
    config: text('config').notNull(), // JSON string
    active: integer('active', { mode: 'boolean' }).default(true),
    createdAt: integer('created_at').notNull(),
});

export const hourlyStats = sqliteTable("hourly_stats", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    monitorId: text("monitor_id").notNull().references(() => monitors.id),
    timestamp: integer("timestamp").notNull(), // Start of the hour (unix timestamp)
    avgLatency: integer("avg_latency").notNull(),
    successCount: integer("success_count").notNull(),
    totalCount: integer("total_count").notNull(),
}, (table) => {
    return {
        idxStatsMonitorTime: index("idx_stats_monitor_time").on(table.monitorId, table.timestamp),
    };
});

export const settings = sqliteTable("settings", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
});