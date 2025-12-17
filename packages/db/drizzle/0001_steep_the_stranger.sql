CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`monitor_id` text NOT NULL,
	`url` text NOT NULL,
	`cause` text NOT NULL,
	`started_at` integer NOT NULL,
	`resolved_at` integer
);
