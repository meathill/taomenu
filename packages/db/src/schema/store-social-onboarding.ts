import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { stores } from './stores';

/** Pro+ 开通后店主提交的平台主页链接（人工对接，不自动发帖） */
export const storeSocialOnboarding = sqliteTable('store_social_onboarding', {
  storeId: text('store_id')
    .primaryKey()
    .references(() => stores.id, { onDelete: 'cascade' }),
  googleMapsUrl: text('google_maps_url'),
  tripadvisorUrl: text('tripadvisor_url'),
  instagramUrl: text('instagram_url'),
  tiktokUrl: text('tiktok_url'),
  facebookUrl: text('facebook_url'),
  notes: text('notes'),
  submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
