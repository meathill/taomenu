CREATE TABLE `menu_imports` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL,
  `source_locale` text,
  `target_locales_json` text DEFAULT '[]' NOT NULL,
  `provider` text NOT NULL,
  `model` text NOT NULL,
  `prompt_version` text NOT NULL,
  `schema_version` text NOT NULL,
  `progress` integer DEFAULT 0 NOT NULL,
  `error_code` text,
  `usage_json` text,
  `estimated_cost_usd_ticks` integer,
  `created_by_user_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `started_at` integer,
  `completed_at` integer,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT
);
CREATE INDEX `menu_imports_store_created_idx` ON `menu_imports` (`store_id`, `created_at`);

CREATE TABLE `menu_import_assets` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `import_id` text NOT NULL,
  `r2_key` text NOT NULL,
  `mime_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `page_order` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`import_id`) REFERENCES `menu_imports`(`id`) ON DELETE CASCADE
);
CREATE INDEX `menu_import_assets_import_idx` ON `menu_import_assets` (`store_id`, `import_id`);

CREATE TABLE `menu_import_suggestions` (
  `id` text PRIMARY KEY NOT NULL,
  `store_id` text NOT NULL,
  `import_id` text NOT NULL,
  `entity_type` text NOT NULL,
  `temporary_entity_key` text NOT NULL,
  `field_name` text DEFAULT 'entity' NOT NULL,
  `locale` text NOT NULL,
  `suggested_value_json` text NOT NULL,
  `confidence` real NOT NULL,
  `decision` text DEFAULT 'pending' NOT NULL,
  `decided_by_user_id` text,
  `decided_at` integer,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`import_id`) REFERENCES `menu_imports`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`decided_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
CREATE INDEX `menu_import_suggestions_import_idx` ON `menu_import_suggestions` (`store_id`, `import_id`);
