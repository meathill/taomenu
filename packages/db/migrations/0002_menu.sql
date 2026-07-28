CREATE TABLE `menus` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `name` text DEFAULT 'Menu' NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `published_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
);

CREATE INDEX `menus_store_id_idx` ON `menus` (`store_id`);

CREATE TABLE `menu_categories` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `menu_id` text NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `is_available` integer DEFAULT 1 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE CASCADE
);

CREATE INDEX `menu_categories_store_menu_idx` ON `menu_categories` (`store_id`, `menu_id`);

CREATE TABLE `menu_category_translations` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `category_id` text NOT NULL,
  `locale` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `source` text DEFAULT 'manual' NOT NULL,
  `review_status` text DEFAULT 'reviewed' NOT NULL,
  `source_generation_id` text,
  `reviewed_by_user_id` text,
  `reviewed_at` integer,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `menu_category_translations_cat_locale` ON `menu_category_translations` (`category_id`, `locale`);

CREATE TABLE `menu_items` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `category_id` text NOT NULL,
  `price_amount` integer NOT NULL,
  `image_key` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `is_available` integer DEFAULT 1 NOT NULL,
  `is_sold_out` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON DELETE CASCADE
);

CREATE INDEX `menu_items_store_category_idx` ON `menu_items` (`store_id`, `category_id`);

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

CREATE UNIQUE INDEX `menu_item_translations_item_locale` ON `menu_item_translations` (`item_id`, `locale`);

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

CREATE TABLE `modifier_group_translations` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `modifier_group_id` text NOT NULL,
  `locale` text NOT NULL,
  `name` text NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`modifier_group_id`) REFERENCES `modifier_groups`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `modifier_group_translations_group_locale` ON `modifier_group_translations` (`modifier_group_id`, `locale`);

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

CREATE UNIQUE INDEX `modifier_translations_mod_locale` ON `modifier_translations` (`modifier_id`, `locale`);
