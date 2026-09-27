import { beforeEach, describe, expect, it } from 'vitest';
import { session, user } from '../schema/auth';
import { menus } from '../schema/menu';
import { diningTables, orders, payments, serviceRequests } from '../schema/tables-orders';
import { seedMember, seedStore } from '../testing/agent-fixtures';
import { createTestDb } from '../testing/memory-d1';
import type { Db } from '../types';
import {
  getAdminBehavior,
  getAdminDailySeries,
  getAdminFunnel,
  getAdminOverview,
  getAdminRange,
  resolveAdminRangeDays,
} from './admin-stats';

const NOW = new Date('2026-09-27T12:00:00Z');

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

let orderSeq = 0;
async function seedOrder(
  db: Db,
  storeId: string,
  input: { status: string; mode: string; amount: number; createdAt: string },
): Promise<void> {
  orderSeq += 1;
  const at = new Date(input.createdAt);
  await db.insert(orders).values({
    id: `order-${orderSeq}`,
    publicTokenHash: `hash-${orderSeq}`,
    storeId,
    fulfillmentMode: input.mode as 'dine_in' | 'pickup',
    displayNumber: orderSeq,
    status: input.status as 'submitted',
    locale: 'vi',
    subtotalAmount: input.amount,
    idempotencyKey: `idem-${orderSeq}`,
    createdAt: at,
    updatedAt: at,
  });
}

async function seedMenu(
  db: Db,
  id: string,
  storeId: string,
  status: 'draft' | 'published',
  publishedAt: string | null,
): Promise<void> {
  const at = new Date('2026-09-20T00:00:00Z');
  await db.insert(menus).values({
    id,
    storeId,
    status,
    publishedAt: publishedAt ? new Date(publishedAt) : null,
    createdAt: at,
    updatedAt: at,
  });
}

/**
 * 固定场景（NOW=2026-09-27，7d 窗口为 09-21~09-27）：
 * - u1 范围内注册，名下 s1(free)/s2(pro)；u2 窗口外注册，名下 s3(停用)；u3 老用户，名下 s4
 * - s5 为 USD 门店，用于验证多币种分别合计
 */
async function seedScenario(db: Db): Promise<void> {
  await seedUserAt(db, 'u1', '2026-09-22T10:00:00Z');
  await seedUserAt(db, 'u2', '2026-09-01T10:00:00Z');
  await seedUserAt(db, 'u3', '2026-01-01T10:00:00Z');

  await seedStore(db, 's1', { plan: 'free', createdAt: new Date('2026-09-23T01:00:00Z') });
  await seedStore(db, 's2', { plan: 'pro', createdAt: new Date('2026-09-24T01:00:00Z') });
  await seedStore(db, 's3', {
    plan: 'pro',
    isActive: false,
    createdAt: new Date('2026-09-25T01:00:00Z'),
  });
  await seedStore(db, 's4', { plan: 'free', createdAt: new Date('2026-08-01T01:00:00Z') });
  await seedStore(db, 's5', {
    plan: 'free',
    currency: 'USD',
    createdAt: new Date('2026-09-25T01:00:00Z'),
  });

  await seedMember(db, 's1', 'u1', 'owner');
  await seedMember(db, 's2', 'u1', 'owner');
  await seedMember(db, 's3', 'u2', 'owner');
  await seedMember(db, 's4', 'u3', 'owner');
  await seedMember(db, 's5', 'u1', 'owner');

  await seedMenu(db, 'm1', 's1', 'published', '2026-09-24T02:00:00Z');
  await seedMenu(db, 'm2', 's2', 'draft', null);
  await seedMenu(db, 'm3', 's4', 'published', '2026-09-26T02:00:00Z');

  await seedSession(db, 'sess-1', 'u1', '2026-09-22T11:00:00Z');
  await seedSession(db, 'sess-2', 'u1', '2026-09-23T11:00:00Z');
  await seedSession(db, 'sess-3', 'u2', '2026-09-10T11:00:00Z');

  await seedOrder(db, 's1', {
    status: 'submitted',
    mode: 'dine_in',
    amount: 50000,
    createdAt: '2026-09-23T12:00:00Z',
  });
  await seedOrder(db, 's1', {
    status: 'served',
    mode: 'dine_in',
    amount: 30000,
    createdAt: '2026-09-23T13:00:00Z',
  });
  await seedOrder(db, 's1', {
    status: 'cancelled',
    mode: 'dine_in',
    amount: 99999,
    createdAt: '2026-09-24T12:00:00Z',
  });
  await seedOrder(db, 's3', {
    status: 'submitted',
    mode: 'dine_in',
    amount: 100000,
    createdAt: '2026-09-24T12:00:00Z',
  });
  await seedOrder(db, 's5', {
    status: 'submitted',
    mode: 'pickup',
    amount: 1000,
    createdAt: '2026-09-25T12:00:00Z',
  });

  const at = new Date('2026-09-20T00:00:00Z');
  await db.insert(diningTables).values({
    id: 't1',
    storeId: 's1',
    name: 'A1',
    sortOrder: 0,
    token: 'tok-t1',
    isActive: true,
    createdAt: at,
    updatedAt: at,
  });
  await db.insert(diningTables).values({
    id: 't3',
    storeId: 's3',
    name: 'B1',
    sortOrder: 0,
    token: 'tok-t3',
    isActive: true,
    createdAt: at,
    updatedAt: at,
  });
  await db.insert(serviceRequests).values({
    id: 'r1',
    publicTokenHash: 'h1',
    storeId: 's1',
    tableId: 't1',
    type: 'call_staff',
    status: 'resolved',
    idempotencyKey: 'idem-r1',
    createdAt: new Date('2026-09-23T14:00:00Z'),
    resolvedAt: new Date('2026-09-23T14:05:00Z'),
  });
  await db.insert(serviceRequests).values({
    id: 'r2',
    publicTokenHash: 'h2',
    storeId: 's1',
    tableId: 't1',
    type: 'request_bill',
    status: 'open',
    idempotencyKey: 'idem-r2',
    createdAt: new Date('2026-09-24T14:00:00Z'),
  });
  await db.insert(serviceRequests).values({
    id: 'r3',
    publicTokenHash: 'h3',
    storeId: 's3',
    tableId: 't3',
    type: 'call_staff',
    status: 'open',
    idempotencyKey: 'idem-r3',
    createdAt: new Date('2026-09-24T14:00:00Z'),
  });

  await db.insert(payments).values({
    id: 'p1',
    storeId: 's1',
    method: 'cash',
    amount: 80000,
    createdAt: new Date('2026-09-23T15:00:00Z'),
  });
  await db.insert(payments).values({
    id: 'p2',
    storeId: 's5',
    method: 'bank_transfer',
    amount: 1000,
    createdAt: new Date('2026-09-25T15:00:00Z'),
  });
  await db.insert(payments).values({
    id: 'p3',
    storeId: 's3',
    method: 'cash',
    amount: 100000,
    createdAt: new Date('2026-09-24T15:00:00Z'),
  });
}

describe('admin range helper', () => {
  it('非法值回落 30d', () => {
    expect(resolveAdminRangeDays('7d')).toBe(7);
    expect(resolveAdminRangeDays('90d')).toBe(90);
    expect(resolveAdminRangeDays('30d')).toBe(30);
    expect(resolveAdminRangeDays(null)).toBe(30);
    expect(resolveAdminRangeDays('7')).toBe(30);
    expect(resolveAdminRangeDays('abc')).toBe(30);
  });

  it('7d 窗口为最近 7 个 UTC 整天（含今天）', () => {
    const range = getAdminRange(7, NOW);
    expect(range.start.toISOString()).toBe('2026-09-21T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-09-28T00:00:00.000Z');
    expect(range.labels).toHaveLength(7);
    expect(range.labels[0]).toBe('2026-09-21');
    expect(range.labels[6]).toBe('2026-09-27');
  });
});

describe('admin 总览', () => {
  let db: Db;

  beforeEach(async () => {
    orderSeq = 0;
    db = createTestDb();
    await seedScenario(db);
  });

  it('范围计数：窗口外用户、取消单、停用店订单不计入', async () => {
    const overview = await getAdminOverview(db, getAdminRange(7, NOW));

    expect(overview.newUsers).toBe(1);
    expect(overview.newStores).toBe(4);
    expect(overview.newPublishes).toBe(2);
    expect(overview.orders).toBe(3);
    expect(overview.activeUsers).toBe(1);
  });

  it('GMV 按币种分别合计，不跨币种相加', async () => {
    const overview = await getAdminOverview(db, getAdminRange(7, NOW));

    expect(overview.gmvByCurrency).toEqual([
      { currency: 'USD', totalMinor: 1000, count: 1 },
      { currency: 'VND', totalMinor: 80000, count: 2 },
    ]);
  });

  it('快照：停用店不计总数与 Pro，累计发布只看营业中门店', async () => {
    const overview = await getAdminOverview(db, getAdminRange(7, NOW));

    expect(overview.totalUsers).toBe(3);
    expect(overview.totalStores).toBe(4);
    expect(overview.proStores).toBe(1);
    expect(overview.publishedStores).toBe(2);
  });
});

describe('admin 按天序列', () => {
  let db: Db;

  beforeEach(async () => {
    orderSeq = 0;
    db = createTestDb();
    await seedScenario(db);
  });

  it('空天补 0，长度与 labels 一致', async () => {
    const range = getAdminRange(7, NOW);
    const series = await getAdminDailySeries(db, range);

    expect(series).toHaveLength(7);
    expect(series[0]).toEqual({
      day: '2026-09-21',
      newUsers: 0,
      newStores: 0,
      orders: 0,
      activeUsers: 0,
    });
    expect(series.find((point) => point.day === '2026-09-22')).toMatchObject({
      newUsers: 1,
      activeUsers: 1,
    });
    expect(series.find((point) => point.day === '2026-09-23')).toMatchObject({
      newStores: 1,
      orders: 2,
      activeUsers: 1,
    });
  });
});

describe('admin 漏斗与行为', () => {
  let db: Db;

  beforeEach(async () => {
    orderSeq = 0;
    db = createTestDb();
    await seedScenario(db);
  });

  it('累计漏斗：纯停用店 owner 不计入建店', async () => {
    const funnel = await getAdminFunnel(db);

    expect(funnel).toEqual({
      totalUsers: 3,
      usersWithStore: 2,
      storesPublished: 2,
      storesWithOrder: 2,
      proStores: 1,
    });
  });

  it('行为聚合：取消单只出现在状态分布，停用店行为全排除', async () => {
    const behavior = await getAdminBehavior(db, getAdminRange(7, NOW));

    expect(behavior.orderStatus).toEqual([
      { status: 'cancelled', count: 1 },
      { status: 'served', count: 1 },
      { status: 'submitted', count: 2 },
    ]);
    expect(behavior.fulfillment).toEqual([
      { mode: 'dine_in', currency: 'VND', count: 2, totalMinor: 80000 },
      { mode: 'pickup', currency: 'USD', count: 1, totalMinor: 1000 },
    ]);
    expect(behavior.serviceRequests).toEqual([
      { type: 'call_staff', count: 1, resolved: 1 },
      { type: 'request_bill', count: 1, resolved: 0 },
    ]);
    expect(behavior.payments).toEqual([
      { method: 'bank_transfer', currency: 'USD', count: 1, totalMinor: 1000 },
      { method: 'cash', currency: 'VND', count: 1, totalMinor: 80000 },
    ]);
  });
});
