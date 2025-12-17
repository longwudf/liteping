PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_heartbeats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`monitor_id` text NOT NULL,
	`status` integer NOT NULL,
	`latency` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`region` text DEFAULT 'Global',
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_heartbeats`("id", "monitor_id", "status", "latency", "timestamp", "region") SELECT "id", "monitor_id", "status", "latency", "timestamp", "region" FROM `heartbeats`;--> statement-breakpoint
DROP TABLE `heartbeats`;--> statement-breakpoint
ALTER TABLE `__new_heartbeats` RENAME TO `heartbeats`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_monitor_timestamp` ON `heartbeats` (`monitor_id`,`timestamp`);