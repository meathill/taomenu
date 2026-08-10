import type { PlanId } from '@taomenu/shared';
import { storeMembers, stores, user } from '../schema';
import type { StoreRole } from '../schema/stores';
import type { Db } from '../types';
import { createTestDb } from './memory-d1';

/**
 * 代理商测试共用夹具，应用全部 migration。
 * stores 的 schema 横跨 0001/0008/0010 多次加列，drizzle insert 会列出所有列，
 * 挑着加载 migration 必然缺列，所以直接按真实顺序全跑一遍。
 */
export function createAgentTestDb(): Db {
  return createTestDb();
}

export async function seedUser(db: Db, id: string, email: string): Promise<void> {
  const now = new Date();
  await db.insert(user).values({
    id,
    name: id,
    email,
    emailVerified: true,
    image: null,
    createdAt: now,
    updatedAt: now,
  });
}

export type SeedStoreOptions = {
  plan?: PlanId;
  isActive?: boolean;
  name?: string;
  createdAt?: Date;
};

export async function seedStore(db: Db, id: string, options: SeedStoreOptions = {}): Promise<void> {
  const createdAt = options.createdAt ?? new Date();
  await db.insert(stores).values({
    id,
    slug: id,
    name: options.name ?? id,
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    baseLocale: 'vi',
    serviceMode: 'table_service',
    acceptingPublicRequests: true,
    plan: options.plan ?? 'free',
    planExpiresAt: null,
    menuVersion: 0,
    orderVersion: 0,
    isActive: options.isActive ?? true,
    createdAt,
    updatedAt: createdAt,
  });
}

export async function seedMember(
  db: Db,
  storeId: string,
  userId: string,
  role: StoreRole = 'owner',
): Promise<void> {
  await db.insert(storeMembers).values({
    id: `${storeId}-${userId}`,
    storeId,
    userId,
    role,
    createdAt: new Date(),
  });
}
