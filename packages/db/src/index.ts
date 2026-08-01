import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import type { Db } from './types';

export * from './business-date';
export * from './crypto-token';
export * from './menu-publish';
export * from './modifier-select';
export * from './order-price';
export * from './repositories';
export * from './schema';
export * from './slug';
export * from './types';

/** Cloudflare D1 最小接口；运行时传入 env.DB。 */
type D1Like = Parameters<typeof drizzle>[0];

/** 从 Cloudflare D1 binding 创建 Drizzle 实例。 */
export function createDb(d1: D1Like): Db {
  return drizzle(d1, { schema });
}

export { schema };
