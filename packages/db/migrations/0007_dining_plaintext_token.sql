-- 桌台/取餐点 token 改为明文长期有效：二维码可重复展示与打印，不再轮换。
-- 存量行无法从 hash 还原明文，统一重置一次（旧二维码失效一次）。

ALTER TABLE `dining_tables` ADD COLUMN `token` text;
UPDATE `dining_tables` SET `token` = lower(hex(randomblob(18))) WHERE `token` IS NULL;
DROP INDEX `dining_tables_token_hash_idx`;
CREATE UNIQUE INDEX `dining_tables_token_unique` ON `dining_tables` (`token`);
ALTER TABLE `dining_tables` DROP COLUMN `token_hash`;
ALTER TABLE `dining_tables` DROP COLUMN `token_version`;

ALTER TABLE `pickup_points` ADD COLUMN `token` text;
UPDATE `pickup_points` SET `token` = lower(hex(randomblob(18))) WHERE `token` IS NULL;
DROP INDEX `pickup_points_token_hash_idx`;
CREATE UNIQUE INDEX `pickup_points_token_unique` ON `pickup_points` (`token`);
ALTER TABLE `pickup_points` DROP COLUMN `token_hash`;
ALTER TABLE `pickup_points` DROP COLUMN `token_version`;
