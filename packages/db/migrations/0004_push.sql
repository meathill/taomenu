CREATE TABLE `push_subscriptions` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `subject_type` text NOT NULL,
  `terminal_id` text,
  `user_id` text,
  `endpoint` text NOT NULL,
  `p256dh_key` text NOT NULL,
  `auth_key` text NOT NULL,
  `platform` text,
  `user_agent` text,
  `created_at` integer NOT NULL,
  `last_success_at` integer,
  `verified_at` integer,
  `disabled_at` integer,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);
CREATE INDEX `push_subscriptions_store_active_idx` ON `push_subscriptions` (`store_id`, `disabled_at`);

CREATE TABLE `notification_outbox` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `event_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `payload_json` text,
  `not_before` integer NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `last_error` text,
  `created_at` integer NOT NULL,
  `processed_at` integer,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
);

CREATE INDEX `notification_outbox_pending_idx` ON `notification_outbox` (`status`, `not_before`);
CREATE INDEX `notification_outbox_store_entity_idx` ON `notification_outbox` (`store_id`, `entity_id`);

CREATE TABLE `notification_deliveries` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `subscription_id` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `response_code` integer,
  `attempts` integer DEFAULT 0 NOT NULL,
  `last_attempt_at` integer,
  `delivered_at` integer,
  FOREIGN KEY (`event_id`) REFERENCES `notification_outbox`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `notification_deliveries_event_sub` ON `notification_deliveries` (`event_id`, `subscription_id`);
