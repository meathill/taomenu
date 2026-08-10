import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createDb } from '../index';
import type { Db } from '../types';

/**
 * 仅供 vitest 使用的内存数据库夹具。
 * 刻意不从 src/index.ts 导出：它依赖 node:sqlite / node:fs，
 * 一旦进入包入口就会被打进 Worker bundle。
 */

type SqlParam = null | number | bigint | string | Uint8Array;

/**
 * 把 node:sqlite 包成 drizzle d1 driver 需要的最小接口，
 * 这样测试跑的是真实 SQL（含 ON CONFLICT / RETURNING）与真实建表语句。
 */
export function createMemoryD1(setupSql: string) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(setupSql);

  return {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...params: SqlParam[]) {
          return {
            async all() {
              return { success: true, results: statement.all(...params), meta: {} };
            },
            async raw() {
              return statement.all(...params).map((row) => Object.values(row));
            },
            async run() {
              const result = statement.run(...params);
              return { success: true, meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  };
}

/** 按文件名读取并拼接 migrations 目录下的真实 SQL。 */
export function readMigrations(...files: string[]): string {
  return files
    .map((file) => readFileSync(new URL(`../../migrations/${file}`, import.meta.url), 'utf8'))
    .join('\n');
}

/**
 * 按文件名顺序读取全部 migration，等价于 wrangler 的应用顺序。
 * drizzle 的 insert 会列出 schema 里的每一列，所以只要用到某张表的完整 schema，
 * 就必须把后续给它加列的 migration 一并跑掉，挑着加载会缺列。
 */
export function readAllMigrations(): string {
  const dir = new URL('../../migrations/', import.meta.url);
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  return readMigrations(...files);
}

/** 用真实 migration 建好表的内存 Db；不传文件名则应用全部 migration。 */
export function createTestDb(...migrationFiles: string[]): Db {
  const setupSql =
    migrationFiles.length > 0 ? readMigrations(...migrationFiles) : readAllMigrations();
  const d1 = createMemoryD1(setupSql);
  return createDb(d1 as unknown as Parameters<typeof createDb>[0]);
}
