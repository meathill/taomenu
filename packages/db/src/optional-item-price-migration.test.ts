import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../migrations/0019_optional_item_price.sql', import.meta.url), 'utf8');

const setupSql = `
PRAGMA foreign_keys = ON;
CREATE TABLE user (id TEXT PRIMARY KEY);
CREATE TABLE stores (id TEXT PRIMARY KEY);
CREATE TABLE menu_categories (id TEXT PRIMARY KEY);
CREATE TABLE orders (id TEXT PRIMARY KEY);
CREATE TABLE \`menu_items\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`store_id\` text NOT NULL,
  \`category_id\` text NOT NULL,
  \`price_amount\` integer NOT NULL,
  \`image_key\` text,
  \`sort_order\` integer DEFAULT 0 NOT NULL,
  \`is_available\` integer DEFAULT 1 NOT NULL,
  \`is_sold_out\` integer DEFAULT 0 NOT NULL,
  \`created_at\` integer NOT NULL,
  \`updated_at\` integer NOT NULL,
  FOREIGN KEY (\`store_id\`) REFERENCES \`stores\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`category_id\`) REFERENCES \`menu_categories\`(\`id\`) ON DELETE CASCADE
);
CREATE TABLE \`menu_item_translations\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`store_id\` text NOT NULL,
  \`item_id\` text NOT NULL,
  \`locale\` text NOT NULL,
  \`name\` text NOT NULL,
  \`description\` text,
  \`source\` text DEFAULT 'manual' NOT NULL,
  \`review_status\` text DEFAULT 'reviewed' NOT NULL,
  \`source_generation_id\` text,
  \`reviewed_by_user_id\` text,
  \`reviewed_at\` integer,
  FOREIGN KEY (\`store_id\`) REFERENCES \`stores\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`item_id\`) REFERENCES \`menu_items\`(\`id\`) ON DELETE CASCADE
);
CREATE TABLE \`modifier_groups\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`store_id\` text NOT NULL,
  \`item_id\` text NOT NULL,
  \`min_selected\` integer DEFAULT 0 NOT NULL,
  \`max_selected\` integer DEFAULT 1 NOT NULL,
  \`sort_order\` integer DEFAULT 0 NOT NULL,
  \`is_required\` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (\`store_id\`) REFERENCES \`stores\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`item_id\`) REFERENCES \`menu_items\`(\`id\`) ON DELETE CASCADE
);
CREATE TABLE \`modifier_group_translations\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`store_id\` text NOT NULL,
  \`modifier_group_id\` text NOT NULL,
  \`locale\` text NOT NULL,
  \`name\` text NOT NULL,
  FOREIGN KEY (\`store_id\`) REFERENCES \`stores\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`modifier_group_id\`) REFERENCES \`modifier_groups\`(\`id\`) ON DELETE CASCADE
);
CREATE TABLE \`modifiers\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`store_id\` text NOT NULL,
  \`modifier_group_id\` text NOT NULL,
  \`price_delta_amount\` integer DEFAULT 0 NOT NULL,
  \`sort_order\` integer DEFAULT 0 NOT NULL,
  \`is_available\` integer DEFAULT 1 NOT NULL,
  FOREIGN KEY (\`store_id\`) REFERENCES \`stores\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`modifier_group_id\`) REFERENCES \`modifier_groups\`(\`id\`) ON DELETE CASCADE
);
CREATE TABLE \`modifier_translations\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`store_id\` text NOT NULL,
  \`modifier_id\` text NOT NULL,
  \`locale\` text NOT NULL,
  \`name\` text NOT NULL,
  \`source\` text DEFAULT 'manual' NOT NULL,
  \`review_status\` text DEFAULT 'reviewed' NOT NULL,
  \`source_generation_id\` text,
  \`reviewed_by_user_id\` text,
  \`reviewed_at\` integer,
  FOREIGN KEY (\`store_id\`) REFERENCES \`stores\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`modifier_id\`) REFERENCES \`modifiers\`(\`id\`) ON DELETE CASCADE
);
CREATE TABLE menu_image_enhancement_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  source_image_key TEXT NOT NULL,
  preview_image_key TEXT,
  error_code TEXT,
  usage_json TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);
CREATE TABLE \`order_items\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`order_id\` text NOT NULL,
  \`menu_item_id\` text NOT NULL,
  \`quantity\` integer NOT NULL,
  \`name_snapshot\` text NOT NULL,
  \`unit_price_amount\` integer NOT NULL,
  \`line_total_amount\` integer NOT NULL,
  FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`menu_item_id\`) REFERENCES \`menu_items\`(\`id\`)
);
`;

describe('0019_optional_item_price', () => {
  it('rebuilds prices as nullable on D1-like FK-on databases without wiping cascade children', () => {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec(setupSql);
    sqlite.exec(`
      INSERT INTO user(id) VALUES ('u1');
      INSERT INTO stores(id) VALUES ('s1');
      INSERT INTO menu_categories(id) VALUES ('c1');
      INSERT INTO orders(id) VALUES ('o1');
      INSERT INTO menu_items(id,store_id,category_id,price_amount,sort_order,is_available,is_sold_out,created_at,updated_at)
        VALUES ('i1','s1','c1',0,0,1,0,1,1), ('i2','s1','c1',55000,1,1,0,1,1);
      INSERT INTO menu_item_translations(id,store_id,item_id,locale,name)
        VALUES ('t1','s1','i1','en','Che'), ('t2','s1','i2','en','Banh mi');
      INSERT INTO modifier_groups(id,store_id,item_id) VALUES ('g1','s1','i2');
      INSERT INTO modifier_group_translations(id,store_id,modifier_group_id,locale,name)
        VALUES ('gt1','s1','g1','en','Size');
      INSERT INTO modifiers(id,store_id,modifier_group_id,price_delta_amount) VALUES ('m1','s1','g1',2000);
      INSERT INTO modifier_translations(id,store_id,modifier_id,locale,name)
        VALUES ('mt1','s1','m1','en','Large');
      INSERT INTO menu_image_enhancement_jobs(id,store_id,item_id,source_image_key,created_by_user_id,created_at)
        VALUES ('j1','s1','i2','img','u1',1);
      INSERT INTO order_items(id,order_id,menu_item_id,quantity,name_snapshot,unit_price_amount,line_total_amount)
        VALUES ('oi1','o1','i2',1,'Banh mi',55000,55000);
    `);

    sqlite.exec('BEGIN');
    sqlite.exec(migration);
    sqlite.exec('COMMIT');

    const counts = sqlite
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM menu_items) AS menu_items,
          (SELECT COUNT(*) FROM menu_item_translations) AS translations,
          (SELECT COUNT(*) FROM modifier_groups) AS groups,
          (SELECT COUNT(*) FROM modifiers) AS modifiers,
          (SELECT COUNT(*) FROM modifier_group_translations) AS group_tr,
          (SELECT COUNT(*) FROM modifier_translations) AS mod_tr,
          (SELECT COUNT(*) FROM menu_image_enhancement_jobs) AS image_jobs,
          (SELECT COUNT(*) FROM order_items) AS order_items`,
      )
      .get() as Record<string, number>;
    expect(counts).toEqual({
      menu_items: 2,
      translations: 2,
      groups: 1,
      modifiers: 1,
      group_tr: 1,
      mod_tr: 1,
      image_jobs: 1,
      order_items: 1,
    });

    const price = (
      sqlite.prepare('PRAGMA table_info(menu_items)').all() as { name: string; notnull: number }[]
    ).find((column) => column.name === 'price_amount');
    const unit = (
      sqlite.prepare('PRAGMA table_info(order_items)').all() as { name: string; notnull: number }[]
    ).find((column) => column.name === 'unit_price_amount');
    expect(price?.notnull).toBe(0);
    expect(unit?.notnull).toBe(0);
    expect(
      (sqlite.prepare("SELECT price_amount FROM menu_items WHERE id='i1'").get() as { price_amount: number })
        .price_amount,
    ).toBe(0);
    expect(sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    sqlite.exec(
      "INSERT INTO menu_items(id,store_id,category_id,price_amount,sort_order,is_available,is_sold_out,created_at,updated_at) VALUES ('i3','s1','c1',NULL,2,1,0,1,1)",
    );
  });
});
