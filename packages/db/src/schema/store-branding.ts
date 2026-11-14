import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { stores } from './stores';

/** 店铺品牌设置：隐藏 Powered by（Pro）与顾客菜单封面（Free） */
export const storeBranding = sqliteTable('store_branding', {
  storeId: text('store_id')
    .primaryKey()
    .references(() => stores.id, { onDelete: 'cascade' }),
  hidePoweredBy: integer('hide_powered_by', { mode: 'boolean' }).notNull().default(false),
  /** 顾客菜单顶部封面；空表示沿用无封面的现有外观 */
  coverImageKey: text('cover_image_key'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
