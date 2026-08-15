import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';

export const userPreferences = sqliteTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  hideMenuProTools: integer('hide_menu_pro_tools', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
