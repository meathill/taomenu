-- 店铺封面图（顾客菜单顶部）。可空；缺列时公开菜单按「无封面」降级。
ALTER TABLE `store_branding` ADD COLUMN `cover_image_key` text;
