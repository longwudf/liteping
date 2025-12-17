CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`message` text,
	`type` text DEFAULT 'info',
	`active` integer DEFAULT true,
	`created_at` integer NOT NULL
);
