import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { stores } from './stores';

/** 店铺品牌设置（issue #26）；目前只有「隐藏 Powered by TaoMenu」一项 */
export const storeBranding = sqliteTable('store_branding', {
  storeId: text('store_id')
    .primaryKey()
    .references(() => stores.id, { onDelete: 'cascade' }),
  hidePoweredBy: integer('hide_powered_by', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
