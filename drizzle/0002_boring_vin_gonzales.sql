CREATE TABLE `planner_events` (
	`owner_id` text NOT NULL,
	`event_id` text NOT NULL,
	`payload` text,
	`revision` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `event_id`)
);
