CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`hide_menu_pro_tools` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
