CREATE TABLE `maintenance` (
	`id` text PRIMARY KEY NOT NULL,
	`monitor_id` text NOT NULL,
	`title` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`created_at` integer NOT NULL
);
