CREATE TABLE `dining_tables` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `name` text NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `token_hash` text NOT NULL,
  `token_version` integer DEFAULT 1 NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
);

CREATE INDEX `dining_tables_store_idx` ON `dining_tables` (`store_id`);
CREATE INDEX `dining_tables_token_hash_idx` ON `dining_tables` (`token_hash`);

CREATE TABLE `pickup_points` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `name` text NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `token_hash` text NOT NULL,
  `token_version` integer DEFAULT 1 NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
);

CREATE INDEX `pickup_points_store_idx` ON `pickup_points` (`store_id`);
CREATE INDEX `pickup_points_token_hash_idx` ON `pickup_points` (`token_hash`);

CREATE TABLE `table_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `table_id` text NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `opened_at` integer NOT NULL,
  `closed_at` integer,
  `closed_by_terminal_id` text,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`table_id`) REFERENCES `dining_tables`(`id`) ON DELETE CASCADE
);

CREATE INDEX `table_sessions_store_table_status_idx` ON `table_sessions` (`store_id`, `table_id`, `status`);

CREATE TABLE `orders` (
  `id` text PRIMARY KEY NOT NULL,
  `public_token_hash` text NOT NULL,
  `store_id` text NOT NULL,
  `fulfillment_mode` text NOT NULL,
  `table_id` text,
  `table_session_id` text,
  `pickup_point_id` text,
  `display_number` integer NOT NULL,
  `pickup_number` integer,
  `business_date` text,
  `status` text DEFAULT 'submitted' NOT NULL,
  `locale` text DEFAULT 'vi' NOT NULL,
  `subtotal_amount` integer NOT NULL,
  `note` text,
  `created_by_actor_type` text DEFAULT 'customer' NOT NULL,
  `created_by_terminal_id` text,
  `idempotency_key` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `orders_store_idempotency` ON `orders` (`store_id`, `idempotency_key`);
CREATE UNIQUE INDEX `orders_store_business_pickup` ON `orders` (`store_id`, `business_date`, `pickup_number`);
CREATE INDEX `orders_store_status_created_idx` ON `orders` (`store_id`, `status`, `created_at`);
CREATE INDEX `orders_public_token_hash_idx` ON `orders` (`public_token_hash`);

CREATE TABLE `order_items` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `menu_item_id` text NOT NULL,
  `quantity` integer NOT NULL,
  `name_snapshot` text NOT NULL,
  `unit_price_amount` integer NOT NULL,
  `line_total_amount` integer NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`)
);

CREATE TABLE `pickup_number_sequences` (
  `store_id` text NOT NULL,
  `business_date` text NOT NULL,
  `next_value` integer DEFAULT 1 NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `pickup_seq_store_date` ON `pickup_number_sequences` (`store_id`, `business_date`);
