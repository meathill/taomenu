import { beforeEach, describe, expect, it } from 'vitest';
import type { AgentRevenueKind } from '../schema/agents';
import { agentLinkClicks, agentRevenueEvents } from '../schema/agents';
import { createAgentTestDb, seedMember, seedStore, seedUser } from '../testing/agent-fixtures';
import type { Db } from '../types';
import { getAdminAgentOverview, getAgentStats } from './agent-stats';
import { attributeUserToAgent, createAgent } from './agents';

async function seedClick(db: Db, agentId: string, day: string, visitorHash: string): Promise<void> {
  await db.insert(agentLinkClicks).values({
    id: `${agentId}-${day}-${visitorHash}`,
    agentId,
    source: 'website',
    day,
    visitorHash,
    createdAt: new Date('2026-08-10T00:00:00Z'),
  });
}

async function seedRevenue(
  db: Db,
  agentId: string,
  input: {
    storeId: string;
    userId: string;
    invoiceId: string;
    amountMinor: number;
    currency: string;
    kind?: AgentRevenueKind;
    createdAt: string;
  },
): Promise<void> {
  await db.insert(agentRevenueEvents).values({
    id: input.invoiceId,
    agentId,
    storeId: input.storeId,
    userId: input.userId,
    stripeInvoiceId: input.invoiceId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    kind: input.kind ?? 'pro_plan',
    createdAt: new Date(input.createdAt),
  });
}

/**
 * 固定场景：
 * - agentA：归因 u1、u2；u1 名下 store-1(pro, 旧) 与 store-2(free, 新)；
 *   u2 名下 store-3 已停用应被排除；3 次点击；usd 两笔 + vnd 一笔收入
 * - agentB：归因 u3，名下 store-4(free)；无点击无收入
 * - u4 无归因，名下 store-5 不应出现在任何统计里
 */
describe('代理商统计', () => {
  let db: Db;
  let agentAId: string;
  let agentBId: string;

  beforeEach(async () => {
    db = createAgentTestDb();

    const agentA = await createAgent(db, { name: '甲', email: 'a@example.com' });
    const agentB = await createAgent(db, { name: '乙', email: 'b@example.com' });
    if (!agentA.agent || !agentB.agent) {
      throw new Error('夹具创建失败');
    }
    agentAId = agentA.agent.id;
    agentBId = agentB.agent.id;

    for (const id of ['u1', 'u2', 'u3', 'u4']) {
      await seedUser(db, id, `${id}@example.com`);
    }

    await attributeUserToAgent(db, { userId: 'u1', code: agentA.agent.code });
    await attributeUserToAgent(db, { userId: 'u2', code: agentA.agent.code });
    await attributeUserToAgent(db, { userId: 'u3', code: agentB.agent.code });

    await seedStore(db, 'store-1', {
      plan: 'pro',
      name: '老店',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await seedStore(db, 'store-2', {
      plan: 'free',
      name: '新店',
      createdAt: new Date('2026-06-01T00:00:00Z'),
    });
    await seedStore(db, 'store-3', { plan: 'pro', name: '停用店', isActive: false });
    await seedStore(db, 'store-4', { plan: 'free', name: '乙的店' });
    await seedStore(db, 'store-5', { plan: 'pro', name: '自然流量店' });

    await seedMember(db, 'store-1', 'u1', 'owner');
    await seedMember(db, 'store-2', 'u1', 'owner');
    await seedMember(db, 'store-3', 'u2', 'owner');
    await seedMember(db, 'store-4', 'u3', 'owner');
    await seedMember(db, 'store-5', 'u4', 'owner');

    await seedClick(db, agentAId, '2026-08-08', 'h1');
    await seedClick(db, agentAId, '2026-08-09', 'h1');
    await seedClick(db, agentAId, '2026-08-09', 'h2');

    await seedRevenue(db, agentAId, {
      storeId: 'store-1',
      userId: 'u1',
      invoiceId: 'in_1',
      amountMinor: 29900,
      currency: 'usd',
      createdAt: '2026-07-01T00:00:00Z',
    });
    await seedRevenue(db, agentAId, {
      storeId: 'store-1',
      userId: 'u1',
      invoiceId: 'in_2',
      amountMinor: 1000,
      currency: 'usd',
      kind: 'staff_seats',
      createdAt: '2026-08-01T00:00:00Z',
    });
    await seedRevenue(db, agentAId, {
      storeId: 'store-2',
      userId: 'u1',
      invoiceId: 'in_3',
      amountMinor: 500000,
      currency: 'vnd',
      createdAt: '2026-06-01T00:00:00Z',
    });
  });

  it('getAgentStats：点击、归因用户与 Pro 计数', async () => {
    const stats = await getAgentStats(db, agentAId);

    expect(stats.totalClicks).toBe(3);
    expect(stats.referredUsers).toBe(2);
    expect(stats.proStoreCount).toBe(1);
  });

  it('getAgentStats：店铺明细按创建时间倒序，含 owner email，排除停用店', async () => {
    const stats = await getAgentStats(db, agentAId);

    expect(stats.stores.map((store) => store.storeId)).toEqual(['store-2', 'store-1']);
    expect(stats.stores[0]).toMatchObject({
      name: '新店',
      plan: 'free',
      ownerEmail: 'u1@example.com',
    });
    expect(stats.stores[1]).toMatchObject({ name: '老店', plan: 'pro' });
  });

  it('getAgentStats：收入按币种分组合计', async () => {
    const stats = await getAgentStats(db, agentAId);

    expect(stats.revenueByCurrency).toEqual([
      { currency: 'usd', totalMinor: 30900, count: 2 },
      { currency: 'vnd', totalMinor: 500000, count: 1 },
    ]);
  });

  it('getAgentStats：收入流水时间倒序且字段完整', async () => {
    const stats = await getAgentStats(db, agentAId);

    expect(stats.revenueEvents.map((event) => event.amountMinor)).toEqual([1000, 29900, 500000]);
    expect(stats.revenueEvents[0]).toMatchObject({
      storeId: 'store-1',
      currency: 'usd',
      kind: 'staff_seats',
    });
    expect(stats.revenueEvents[0]?.createdAt).toBeInstanceOf(Date);
  });

  it('getAgentStats：零数据代理商返回 0 与空数组', async () => {
    const stats = await getAgentStats(db, agentBId);

    expect(stats.totalClicks).toBe(0);
    expect(stats.proStoreCount).toBe(0);
    expect(stats.revenueByCurrency).toEqual([]);
    expect(stats.revenueEvents).toEqual([]);
    expect(stats.referredUsers).toBe(1);
    expect(stats.stores.map((store) => store.storeId)).toEqual(['store-4']);
  });

  it('getAdminAgentOverview：每代理商一行且含 agents 全字段', async () => {
    const overview = await getAdminAgentOverview(db);
    expect(overview).toHaveLength(2);

    const rowA = overview.find((row) => row.id === agentAId);
    const rowB = overview.find((row) => row.id === agentBId);

    expect(rowA).toMatchObject({
      name: '甲',
      email: 'a@example.com',
      status: 'active',
      totalClicks: 3,
      referredUsers: 2,
      storeCount: 2,
      proStoreCount: 1,
    });
    expect(rowA?.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(rowA?.createdAt).toBeInstanceOf(Date);
    expect(rowA?.revenueByCurrency).toEqual([
      { currency: 'usd', totalMinor: 30900, count: 2 },
      { currency: 'vnd', totalMinor: 500000, count: 1 },
    ]);

    expect(rowB).toMatchObject({
      totalClicks: 0,
      referredUsers: 1,
      storeCount: 1,
      proStoreCount: 0,
    });
    expect(rowB?.revenueByCurrency).toEqual([]);
  });

  it('getAdminAgentOverview：无归因商家不计入任何代理商', async () => {
    const overview = await getAdminAgentOverview(db);
    const totalStores = overview.reduce((sum, row) => sum + row.storeCount, 0);
    // store-3 停用、store-5 无归因，都不该被算进来
    expect(totalStores).toBe(3);
  });
});
