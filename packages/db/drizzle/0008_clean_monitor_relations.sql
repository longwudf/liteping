PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_heartbeats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`monitor_id` text NOT NULL,
	`status` integer NOT NULL,
	`latency` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`region` text DEFAULT 'Global',
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_heartbeats`("id", "monitor_id", "status", "latency", "timestamp", "region")
SELECT "id", "monitor_id", "status", "latency", "timestamp", "region"
FROM `heartbeats`
WHERE "monitor_id" IN (SELECT "id" FROM `monitors`);--> statement-breakpoint
DROP TABLE `heartbeats`;--> statement-breakpoint
ALTER TABLE `__new_heartbeats` RENAME TO `heartbeats`;--> statement-breakpoint
CREATE INDEX `idx_monitor_timestamp` ON `heartbeats` (`monitor_id`,`timestamp`);--> statement-breakpoint

CREATE TABLE `__new_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`monitor_id` text NOT NULL,
	`url` text NOT NULL,
	`cause` text NOT NULL,
	`started_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_incidents`("id", "monitor_id", "url", "cause", "started_at", "resolved_at")
SELECT "id", "monitor_id", "url", "cause", "started_at", "resolved_at"
FROM `incidents`
WHERE "monitor_id" IN (SELECT "id" FROM `monitors`);--> statement-breakpoint
DROP TABLE `incidents`;--> statement-breakpoint
ALTER TABLE `__new_incidents` RENAME TO `incidents`;--> statement-breakpoint

CREATE TABLE `__new_maintenance` (
	`id` text PRIMARY KEY NOT NULL,
	`monitor_id` text NOT NULL,
	`title` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_maintenance`("id", "monitor_id", "title", "start_time", "end_time", "created_at")
SELECT "id", "monitor_id", "title", "start_time", "end_time", "created_at"
FROM `maintenance`
WHERE "monitor_id" IN (SELECT "id" FROM `monitors`);--> statement-breakpoint
DROP TABLE `maintenance`;--> statement-breakpoint
ALTER TABLE `__new_maintenance` RENAME TO `maintenance`;--> statement-breakpoint

CREATE TABLE `__new_hourly_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`monitor_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`avg_latency` integer NOT NULL,
	`success_count` integer NOT NULL,
	`total_count` integer NOT NULL,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_hourly_stats`("id", "monitor_id", "timestamp", "avg_latency", "success_count", "total_count")
SELECT
	MIN("id") AS "id",
	"monitor_id",
	"timestamp",
	CAST(AVG("avg_latency") AS INTEGER) AS "avg_latency",
	SUM("success_count") AS "success_count",
	SUM("total_count") AS "total_count"
FROM `hourly_stats`
WHERE "monitor_id" IN (SELECT "id" FROM `monitors`)
GROUP BY "monitor_id", "timestamp";--> statement-breakpoint
DROP TABLE `hourly_stats`;--> statement-breakpoint
ALTER TABLE `__new_hourly_stats` RENAME TO `hourly_stats`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_stats_monitor_time` ON `hourly_stats` (`monitor_id`,`timestamp`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
