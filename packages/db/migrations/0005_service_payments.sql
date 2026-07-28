CREATE TABLE `service_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `public_token_hash` text NOT NULL,
  `store_id` text NOT NULL,
  `table_id` text NOT NULL,
  `table_session_id` text,
  `type` text NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `idempotency_key` text NOT NULL,
  `created_at` integer NOT NULL,
  `acknowledged_at` integer,
  `resolved_at` integer,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`table_id`) REFERENCES `dining_tables`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `service_requests_store_idempotency` ON `service_requests` (`store_id`, `idempotency_key`);
CREATE INDEX `service_requests_public_token_idx` ON `service_requests` (`public_token_hash`);
CREATE INDEX `service_requests_store_status_idx` ON `service_requests` (`store_id`, `status`);

CREATE TABLE `payments` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `table_session_id` text,
  `order_id` text,
  `type` text DEFAULT 'payment' NOT NULL,
  `method` text NOT NULL,
  `amount` integer NOT NULL,
  `note` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
);

CREATE INDEX `payments_store_session_idx` ON `payments` (`store_id`, `table_session_id`);
CREATE INDEX `payments_store_order_idx` ON `payments` (`store_id`, `order_id`);
