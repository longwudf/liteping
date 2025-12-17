CREATE TABLE `hourly_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`monitor_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`avg_latency` integer NOT NULL,
	`success_count` integer NOT NULL,
	`total_count` integer NOT NULL,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_stats_monitor_time` ON `hourly_stats` (`monitor_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
