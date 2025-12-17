CREATE TABLE `notifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`config` text NOT NULL,
	`active` integer DEFAULT true,
	`created_at` integer NOT NULL
);
