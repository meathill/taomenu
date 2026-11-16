-- Pro+ 开通后收集商家各平台主页链接，供我们手动对接运营。
CREATE TABLE `store_social_onboarding` (
  `store_id` text PRIMARY KEY NOT NULL,
  `google_maps_url` text,
  `tripadvisor_url` text,
  `instagram_url` text,
  `tiktok_url` text,
  `facebook_url` text,
  `notes` text,
  `submitted_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
);
