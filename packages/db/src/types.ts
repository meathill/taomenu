import type { PlanId } from '@taomenu/shared';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from './schema/index';
import type { StoreRole } from './schema/stores';

export type AppSchema = typeof schema;
export type Db = DrizzleD1Database<AppSchema>;

/**
 * 已鉴权的门店上下文。repository 第一参数必须是它，
 * 查询永远带着 storeId，禁止仅按实体 id 做后台读取。
 */
export type StoreContext = {
  storeId: string;
  userId: string;
  role: StoreRole;
  plan: PlanId;
};
