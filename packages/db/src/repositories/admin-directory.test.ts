import { beforeEach, describe, expect, it } from 'vitest';
import { session, user } from '../schema/auth';
import { orders } from '../schema/tables-orders';
import { seedMember, seedStore } from '../testing/agent-fixtures';
import { createTestDb } from '../testing/memory-d1';
import type { Db } from '../types';
import {
  getAdminUserDetail,
  listAdminStores,
  listAdminUsers,
  resolveAdminPage,
} from './admin-directory';

async function seedUserAt(db: Db, id: string, createdAt: string): Promise<void> {
  const at = new Date(createdAt);
  await db.insert(user).values({
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: true,
    image: null,
    createdAt: at,
    updatedAt: at,
  });
}

async function seedSession(db: Db, id: string, userId: string, createdAt: string): Promise<void> {
  const at = new Date(createdAt);
  await db.insert(session).values({
    id,
    expiresAt: new Date('2027-01-01T00:00:00Z'),
    token: `token-${id}`,
    createdAt: at,
    updatedAt: at,
    userId,
  });
}

let orderSeq = 100;
async function seedOrder(
  db: Db,
  storeId: string,
  input: { status: 'submitted' | 'served' | 'cancelled'; amount: number; createdAt: string },
): Promise<void> {
  orderSeq += 1;
  const at = new Date(input.createdAt);
  await db.insert(orders).values({
    id: `dir-order-${orderSeq}`,
    publicTokenHash: `dir-hash-${orderSeq}`,
    storeId,
    fulfillmentMode: 'dine_in',
    displayNumber: orderSeq,
    status: input.status,
    locale: 'vi',
    subtotalAmount: input.amount,
    idempotencyKey: `dir-idem-${orderSeq}`,
    createdAt: at,
    updatedAt: at,
  });
}

/**
 * 固定场景：
 * - u1（新）名下 s1(free)/s2(pro)，登录 2 次；u2（中）名下只有停用店 s3，未登录；
 *   u3（老）无门店，登录 1 次
 */
async function seedScenario(db: Db): Promise<void> {
  await seedUserAt(db, 'u1', '2026-09-22T10:00:00Z');
  await seedUserAt(db, 'u2', '2026-09-10T10:00:00Z');
  await seedUserAt(db, 'u3', '2026-01-01T10:00:00Z');

  await seedStore(db, 's1', { plan: 'free', createdAt: new Date('2026-09-23T01:00:00Z') });
  await seedStore(db, 's2', { plan: 'pro', createdAt: new Date('2026-09-24T01:00:00Z') });
  await seedStore(db, 's3', { plan: 'free', isActive: false });

  await seedMember(db, 's1', 'u1', 'owner');
  await seedMember(db, 's2', 'u1', 'owner');
  await seedMember(db, 's3', 'u2', 'owner');

  await seedSession(db, 'd-sess-1', 'u1', '2026-09-22T11:00:00Z');
  await seedSession(db, 'd-sess-2', 'u1', '2026-09-23T11:00:00Z');
  await seedSession(db, 'd-sess-3', 'u3', '2026-09-01T11:00:00Z');

  await seedOrder(db, 's1', {
    status: 'submitted',
    amount: 50000,
    createdAt: '2026-09-23T12:00:00Z',
  });
  await seedOrder(db, 's1', {
    status: 'cancelled',
    amount: 70000,
    createdAt: '2026-09-23T13:00:00Z',
  });
  await seedOrder(db, 's2', { status: 'served', amount: 20000, createdAt: '2026-09-24T12:00:00Z' });
}

describe('admin page helper', () => {
  it('非正整数回落第 1 页', () => {
    expect(resolveAdminPage(undefined)).toBe(1);
    expect(resolveAdminPage('0')).toBe(1);
    expect(resolveAdminPage('-2')).toBe(1);
    expect(resolveAdminPage('1.5')).toBe(1);
    expect(resolveAdminPage('abc')).toBe(1);
    expect(resolveAdminPage('2')).toBe(2);
  });
});

describe('admin 用户列表', () => {
  let db: Db;

  beforeEach(async () => {
    db = createTestDb();
    await seedScenario(db);
  });

  it('按注册时间倒序，附带门店数与登录信息', async () => {
    const list = await listAdminUsers(db, { query: '', page: 1 });

    expect(list.total).toBe(3);
    expect(list.rows.map((row) => row.id)).toEqual(['u1', 'u2', 'u3']);
    expect(list.rows[0]).toMatchObject({
      email: 'u1@example.com',
      storeCount: 2,
      proStoreCount: 1,
      loginCount: 2,
    });
    expect(list.rows[0]?.lastActiveAt).toEqual(new Date('2026-09-23T11:00:00Z'));
  });

  it('纯停用店 owner 按 0 店统计，从未登录则 lastActiveAt 为 null', async () => {
    const list = await listAdminUsers(db, { query: '', page: 1 });
    const u2 = list.rows.find((row) => row.id === 'u2');

    expect(u2).toMatchObject({ storeCount: 0, proStoreCount: 0, loginCount: 0 });
    expect(u2?.lastActiveAt).toBeNull();
  });

  it('支持按 email 模糊搜索', async () => {
    const list = await listAdminUsers(db, { query: 'u1', page: 1 });

    expect(list.total).toBe(1);
    expect(list.rows.map((row) => row.id)).toEqual(['u1']);
  });

  it('超页返回空行但总数不变', async () => {
    const list = await listAdminUsers(db, { query: '', page: 2 });

    expect(list.total).toBe(3);
    expect(list.rows).toEqual([]);
  });
});

describe('admin 用户详情', () => {
  let db: Db;

  beforeEach(async () => {
    db = createTestDb();
    await seedScenario(db);
  });

  it('返回名下门店与订单统计，取消单不计', async () => {
    const detail = await getAdminUserDetail(db, 'u1');

    expect(detail).toMatchObject({
      email: 'u1@example.com',
      totalLogins: 2,
    });
    expect(detail?.lastActiveAt).toEqual(new Date('2026-09-23T11:00:00Z'));
    expect(detail?.stores.map((store) => store.id)).toEqual(['s2', 's1']);
    expect(detail?.stores.find((store) => store.id === 's1')).toMatchObject({
      orderCount: 1,
      gmvMinor: 50000,
    });
    expect(detail?.stores.find((store) => store.id === 's2')).toMatchObject({
      orderCount: 1,
      gmvMinor: 20000,
    });
  });

  it('未知用户返回 null', async () => {
    await expect(getAdminUserDetail(db, 'ghost')).resolves.toBeNull();
  });
});

describe('admin 门店列表', () => {
  let db: Db;

  beforeEach(async () => {
    db = createTestDb();
    await seedScenario(db);
  });

  it('含 owner 邮箱与订单统计，停用店也在列', async () => {
    const list = await listAdminStores(db, { query: '', page: 1 });

    expect(list.total).toBe(3);
    const s1 = list.rows.find((row) => row.id === 's1');
    expect(s1).toMatchObject({
      owners: ['u1@example.com'],
      orderCount: 1,
      gmvMinor: 50000,
    });
    expect(s1?.lastOrderAt).toEqual(new Date('2026-09-23T12:00:00Z'));
    const s3 = list.rows.find((row) => row.id === 's3');
    expect(s3).toMatchObject({ isActive: false, orderCount: 0 });
  });

  it('支持按名称搜索', async () => {
    const list = await listAdminStores(db, { query: 's2', page: 1 });

    expect(list.total).toBe(1);
    expect(list.rows.map((row) => row.id)).toEqual(['s2']);
  });
});
