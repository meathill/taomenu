-- Menu items may have no listed price (guests see "Ask staff").
-- SQLite/D1 cannot drop NOT NULL in place, so rebuild menu_items and order_items.
-- Existing 0 values stay 0 (a real free price). Do not convert them automatically.
--
-- D1 ignores PRAGMA foreign_keys = OFF and always enforces FKs. defer_foreign_keys
-- does not disable ON DELETE CASCADE, so a parent DROP would wipe translations and
-- modifiers. Copy dependents into FK-less backup tables, drop in child-first
-- order, then recreate the schema and restore the rows.

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

CREATE TABLE `menu_item_translations__bak` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `item_id` text NOT NULL,
  `locale` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `source` text NOT NULL,
  `review_status` text NOT NULL,
  `source_generation_id` text,
  `reviewed_by_user_id` text,
  `reviewed_at` integer
);
INSERT INTO `menu_item_translations__bak`
SELECT
  `id`, `store_id`, `item_id`, `locale`, `name`, `description`, `source`,
  `review_status`, `source_generation_id`, `reviewed_by_user_id`, `reviewed_at`
FROM `menu_item_translations`;

CREATE TABLE `modifier_groups__bak` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `item_id` text NOT NULL,
  `min_selected` integer NOT NULL,
  `max_selected` integer NOT NULL,
  `sort_order` integer NOT NULL,
  `is_required` integer NOT NULL
);
INSERT INTO `modifier_groups__bak`
SELECT
  `id`, `store_id`, `item_id`, `min_selected`, `max_selected`, `sort_order`, `is_required`
FROM `modifier_groups`;

CREATE TABLE `modifiers__bak` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `modifier_group_id` text NOT NULL,
  `price_delta_amount` integer NOT NULL,
  `sort_order` integer NOT NULL,
  `is_available` integer NOT NULL
);
INSERT INTO `modifiers__bak`
SELECT
  `id`, `store_id`, `modifier_group_id`, `price_delta_amount`, `sort_order`, `is_available`
FROM `modifiers`;

CREATE TABLE `modifier_group_translations__bak` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `modifier_group_id` text NOT NULL,
  `locale` text NOT NULL,
  `name` text NOT NULL
);
INSERT INTO `modifier_group_translations__bak`
SELECT `id`, `store_id`, `modifier_group_id`, `locale`, `name`
FROM `modifier_group_translations`;

CREATE TABLE `modifier_translations__bak` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `modifier_id` text NOT NULL,
  `locale` text NOT NULL,
  `name` text NOT NULL,
  `source` text NOT NULL,
  `review_status` text NOT NULL,
  `source_generation_id` text,
  `reviewed_by_user_id` text,
  `reviewed_at` integer
);
INSERT INTO `modifier_translations__bak`
SELECT
  `id`, `store_id`, `modifier_id`, `locale`, `name`, `source`,
  `review_status`, `source_generation_id`, `reviewed_by_user_id`, `reviewed_at`
FROM `modifier_translations`;

CREATE TABLE `menu_image_enhancement_jobs__bak` (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL,
  source_image_key TEXT NOT NULL,
  preview_image_key TEXT,
  error_code TEXT,
  usage_json TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);
INSERT INTO `menu_image_enhancement_jobs__bak`
SELECT
  id, store_id, item_id, status, source_image_key, preview_image_key,
  error_code, usage_json, created_by_user_id, created_at, started_at, completed_at
FROM menu_image_enhancement_jobs;

CREATE TABLE `order_items__bak` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `menu_item_id` text NOT NULL,
  `quantity` integer NOT NULL,
  `name_snapshot` text NOT NULL,
  `unit_price_amount` integer,
  `line_total_amount` integer
);
INSERT INTO `order_items__bak`
SELECT
  `id`, `order_id`, `menu_item_id`, `quantity`, `name_snapshot`,
  `unit_price_amount`, `line_total_amount`
FROM `order_items`;

DROP TABLE `modifier_translations`;
DROP TABLE `modifier_group_translations`;
DROP TABLE `modifiers`;
DROP TABLE `modifier_groups`;
DROP TABLE `menu_item_translations`;
DROP TABLE `menu_image_enhancement_jobs`;
DROP TABLE `order_items`;
DROP TABLE `menu_items`;

ALTER TABLE `menu_items_new` RENAME TO `menu_items`;

CREATE TABLE `order_items` (
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
INSERT INTO `order_items`
SELECT
  `id`, `order_id`, `menu_item_id`, `quantity`, `name_snapshot`,
  `unit_price_amount`, `line_total_amount`
FROM `order_items__bak`;

CREATE TABLE `menu_item_translations` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `item_id` text NOT NULL,
  `locale` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `source` text DEFAULT 'manual' NOT NULL,
  `review_status` text DEFAULT 'reviewed' NOT NULL,
  `source_generation_id` text,
  `reviewed_by_user_id` text,
  `reviewed_at` integer,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE
);
INSERT INTO `menu_item_translations` (
  `id`, `store_id`, `item_id`, `locale`, `name`, `description`, `source`,
  `review_status`, `source_generation_id`, `reviewed_by_user_id`, `reviewed_at`
)
SELECT
  `id`, `store_id`, `item_id`, `locale`, `name`, `description`, `source`,
  `review_status`, `source_generation_id`, `reviewed_by_user_id`, `reviewed_at`
FROM `menu_item_translations__bak`;

CREATE TABLE `modifier_groups` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `item_id` text NOT NULL,
  `min_selected` integer DEFAULT 0 NOT NULL,
  `max_selected` integer DEFAULT 1 NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `is_required` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE
);
INSERT INTO `modifier_groups` (
  `id`, `store_id`, `item_id`, `min_selected`, `max_selected`, `sort_order`, `is_required`
)
SELECT
  `id`, `store_id`, `item_id`, `min_selected`, `max_selected`, `sort_order`, `is_required`
FROM `modifier_groups__bak`;

CREATE TABLE `modifiers` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `modifier_group_id` text NOT NULL,
  `price_delta_amount` integer DEFAULT 0 NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `is_available` integer DEFAULT 1 NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`modifier_group_id`) REFERENCES `modifier_groups`(`id`) ON DELETE CASCADE
);
INSERT INTO `modifiers` (
  `id`, `store_id`, `modifier_group_id`, `price_delta_amount`, `sort_order`, `is_available`
)
SELECT
  `id`, `store_id`, `modifier_group_id`, `price_delta_amount`, `sort_order`, `is_available`
FROM `modifiers__bak`;

CREATE TABLE `modifier_group_translations` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `modifier_group_id` text NOT NULL,
  `locale` text NOT NULL,
  `name` text NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`modifier_group_id`) REFERENCES `modifier_groups`(`id`) ON DELETE CASCADE
);
INSERT INTO `modifier_group_translations` (
  `id`, `store_id`, `modifier_group_id`, `locale`, `name`
)
SELECT `id`, `store_id`, `modifier_group_id`, `locale`, `name`
FROM `modifier_group_translations__bak`;

CREATE TABLE `modifier_translations` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `modifier_id` text NOT NULL,
  `locale` text NOT NULL,
  `name` text NOT NULL,
  `source` text DEFAULT 'manual' NOT NULL,
  `review_status` text DEFAULT 'reviewed' NOT NULL,
  `source_generation_id` text,
  `reviewed_by_user_id` text,
  `reviewed_at` integer,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`modifier_id`) REFERENCES `modifiers`(`id`) ON DELETE CASCADE
);
INSERT INTO `modifier_translations` (
  `id`, `store_id`, `modifier_id`, `locale`, `name`, `source`,
  `review_status`, `source_generation_id`, `reviewed_by_user_id`, `reviewed_at`
)
SELECT
  `id`, `store_id`, `modifier_id`, `locale`, `name`, `source`,
  `review_status`, `source_generation_id`, `reviewed_by_user_id`, `reviewed_at`
FROM `modifier_translations__bak`;

CREATE TABLE `menu_image_enhancement_jobs` (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  source_image_key TEXT NOT NULL,
  preview_image_key TEXT,
  error_code TEXT,
  usage_json TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);
INSERT INTO `menu_image_enhancement_jobs` (
  id, store_id, item_id, status, source_image_key, preview_image_key,
  error_code, usage_json, created_by_user_id, created_at, started_at, completed_at
)
SELECT
  id, store_id, item_id, status, source_image_key, preview_image_key,
  error_code, usage_json, created_by_user_id, created_at, started_at, completed_at
FROM `menu_image_enhancement_jobs__bak`;

DROP TABLE `menu_item_translations__bak`;
DROP TABLE `modifier_groups__bak`;
DROP TABLE `modifiers__bak`;
DROP TABLE `modifier_group_translations__bak`;
DROP TABLE `modifier_translations__bak`;
DROP TABLE `menu_image_enhancement_jobs__bak`;
DROP TABLE `order_items__bak`;

CREATE INDEX `menu_items_store_category_idx` ON `menu_items` (`store_id`, `category_id`);
CREATE UNIQUE INDEX `menu_item_translations_item_locale` ON `menu_item_translations` (`item_id`, `locale`);
CREATE UNIQUE INDEX `modifier_group_translations_group_locale` ON `modifier_group_translations` (`modifier_group_id`, `locale`);
CREATE UNIQUE INDEX `modifier_translations_mod_locale` ON `modifier_translations` (`modifier_id`, `locale`);
CREATE INDEX menu_image_enhancement_jobs_store_created_idx
  ON menu_image_enhancement_jobs(store_id, created_at);
CREATE INDEX menu_image_enhancement_jobs_item_created_idx
  ON menu_image_enhancement_jobs(store_id, item_id, created_at);
