-- Better Auth
CREATE TABLE `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `email_verified` integer DEFAULT 0 NOT NULL,
  `image` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);

CREATE TABLE `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expires_at` integer NOT NULL,
  `token` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `user_id` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);

CREATE TABLE `account` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `user_id` text NOT NULL,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` integer,
  `refresh_token_expires_at` integer,
  `scope` text,
  `password` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);

CREATE TABLE `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer,
  `updated_at` integer
);

CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);

-- Tenant
CREATE TABLE `stores` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `timezone` text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
  `currency` text DEFAULT 'VND' NOT NULL,
  `base_locale` text DEFAULT 'vi' NOT NULL,
  `service_mode` text NOT NULL,
  `accepting_public_requests` integer DEFAULT 1 NOT NULL,
  `plan` text DEFAULT 'free' NOT NULL,
  `plan_expires_at` integer,
  `menu_version` integer DEFAULT 0 NOT NULL,
  `order_version` integer DEFAULT 0 NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `stores_slug_unique` ON `stores` (`slug`);

CREATE TABLE `store_members` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `user_id` text NOT NULL,
  `role` text DEFAULT 'owner' NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `store_members_store_user_unique` ON `store_members` (`store_id`, `user_id`);
CREATE INDEX `store_members_user_id_idx` ON `store_members` (`user_id`);
