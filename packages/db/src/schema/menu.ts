import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { stores } from './stores';

export const MENU_STATUSES = ['draft', 'published'] as const;
export type MenuStatus = (typeof MENU_STATUSES)[number];

export const TRANSLATION_SOURCES = ['manual', 'ai'] as const;
export type TranslationSource = (typeof TRANSLATION_SOURCES)[number];

export const REVIEW_STATUSES = ['machine_draft', 'reviewed'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const menus = sqliteTable('menus', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Menu'),
  status: text('status').notNull().$type<MenuStatus>().default('draft'),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const menuCategories = sqliteTable('menu_categories', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  menuId: text('menu_id')
    .notNull()
    .references(() => menus.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const menuCategoryTranslations = sqliteTable(
  'menu_category_translations',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => menuCategories.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    source: text('source').notNull().$type<TranslationSource>().default('manual'),
    reviewStatus: text('review_status').notNull().$type<ReviewStatus>().default('reviewed'),
    sourceGenerationId: text('source_generation_id'),
    reviewedByUserId: text('reviewed_by_user_id'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('menu_category_translations_cat_locale').on(table.categoryId, table.locale),
  ],
);

export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  categoryId: text('category_id')
    .notNull()
    .references(() => menuCategories.id, { onDelete: 'cascade' }),
  priceAmount: integer('price_amount').notNull(),
  imageKey: text('image_key'),
  sortOrder: integer('sort_order').notNull().default(0),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  isSoldOut: integer('is_sold_out', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const menuItemTranslations = sqliteTable(
  'menu_item_translations',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    source: text('source').notNull().$type<TranslationSource>().default('manual'),
    reviewStatus: text('review_status').notNull().$type<ReviewStatus>().default('reviewed'),
    sourceGenerationId: text('source_generation_id'),
    reviewedByUserId: text('reviewed_by_user_id'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [uniqueIndex('menu_item_translations_item_locale').on(table.itemId, table.locale)],
);

export const modifierGroups = sqliteTable('modifier_groups', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  itemId: text('item_id')
    .notNull()
    .references(() => menuItems.id, { onDelete: 'cascade' }),
  minSelected: integer('min_selected').notNull().default(0),
  maxSelected: integer('max_selected').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
});

export const modifierGroupTranslations = sqliteTable(
  'modifier_group_translations',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    modifierGroupId: text('modifier_group_id')
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
  },
  (table) => [
    uniqueIndex('modifier_group_translations_group_locale').on(table.modifierGroupId, table.locale),
  ],
);

export const modifiers = sqliteTable('modifiers', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  modifierGroupId: text('modifier_group_id')
    .notNull()
    .references(() => modifierGroups.id, { onDelete: 'cascade' }),
  priceDeltaAmount: integer('price_delta_amount').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
});

export const modifierTranslations = sqliteTable(
  'modifier_translations',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    modifierId: text('modifier_id')
      .notNull()
      .references(() => modifiers.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    source: text('source').notNull().$type<TranslationSource>().default('manual'),
    reviewStatus: text('review_status').notNull().$type<ReviewStatus>().default('reviewed'),
    sourceGenerationId: text('source_generation_id'),
    reviewedByUserId: text('reviewed_by_user_id'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [uniqueIndex('modifier_translations_mod_locale').on(table.modifierId, table.locale)],
);
