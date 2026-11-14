-- issue #26：店铺品牌设置。单独建表，不改 stores；表缺失时代码按默认值（显示 Powered by）降级。
CREATE TABLE `store_branding` (
	`store_id` text PRIMARY KEY NOT NULL,
	`hide_powered_by` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
