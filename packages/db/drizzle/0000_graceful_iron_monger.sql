CREATE TABLE `heartbeats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`monitor_id` text NOT NULL,
	`status` integer NOT NULL,
	`latency` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`region` text DEFAULT 'unknown',
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_monitor_timestamp` ON `heartbeats` (`monitor_id`,`timestamp`);--> statement-breakpoint
CREATE TABLE `monitors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`method` text DEFAULT 'HEAD',
	`interval` integer DEFAULT 60,
	`active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch())
);
