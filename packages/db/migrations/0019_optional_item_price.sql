-- Menu items may have no listed price (guests see "Ask staff").
-- SQLite cannot drop NOT NULL in place, so rebuild the two tables.
-- Existing 0 values stay 0 (a real free price). Do not convert them automatically.

PRAGMA foreign_keys = OFF;

CREATE TABLE `menu_items_new` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `category_id` text NOT NULL,
  `price_amount` integer,
  `image_key` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `is_available` integer DEFAULT 1 NOT NULL,
  `is_sold_out` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON DELETE CASCADE
);

INSERT INTO `menu_items_new` (
  `id`, `store_id`, `category_id`, `price_amount`, `image_key`,
  `sort_order`, `is_available`, `is_sold_out`, `created_at`, `updated_at`
)
SELECT
  `id`, `store_id`, `category_id`, `price_amount`, `image_key`,
  `sort_order`, `is_available`, `is_sold_out`, `created_at`, `updated_at`
FROM `menu_items`;

DROP TABLE `menu_items`;
ALTER TABLE `menu_items_new` RENAME TO `menu_items`;
CREATE INDEX `menu_items_store_category_idx` ON `menu_items` (`store_id`, `category_id`);

CREATE TABLE `order_items_new` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `menu_item_id` text NOT NULL,
  `quantity` integer NOT NULL,
  `name_snapshot` text NOT NULL,
  `unit_price_amount` integer,
  `line_total_amount` integer,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`)
);

INSERT INTO `order_items_new` (
  `id`, `order_id`, `menu_item_id`, `quantity`, `name_snapshot`,
  `unit_price_amount`, `line_total_amount`
)
SELECT
  `id`, `order_id`, `menu_item_id`, `quantity`, `name_snapshot`,
  `unit_price_amount`, `line_total_amount`
FROM `order_items`;

DROP TABLE `order_items`;
ALTER TABLE `order_items_new` RENAME TO `order_items`;

PRAGMA foreign_keys = ON;
