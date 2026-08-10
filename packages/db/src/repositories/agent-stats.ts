/**
 * 代理商统计聚合。与 agents.ts 同属显式跨租户域：db 为首参，不走 StoreContext，
 * 鉴权由 API / 页面层的 requireAdmin / requireAgent 完成。
 *
 * 付费转化不落表，一律从 agent_referrals → store_members(owner) → stores.plan 现算，
 * 保证与门店真实 plan 永远一致，不会出现统计表与业务表对不上的经典问题。
 */

import type { PlanId } from '@taomenu/shared';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { AgentRevenueKind } from '../schema/agents';
import { agentLinkClicks, agentReferrals, agentRevenueEvents, agents } from '../schema/agents';
import { user } from '../schema/auth';
import { storeMembers, stores } from '../schema/stores';
import type { Db } from '../types';
import type { AgentRow } from './agents';

export type AgentRevenueByCurrency = {
  currency: string;
  totalMinor: number;
  count: number;
};

export type AgentStoreDetail = {
  storeId: string;
  name: string;
  plan: PlanId;
  createdAt: Date;
  ownerEmail: string;
};

export type AgentRevenueEventDetail = {
  storeId: string;
  amountMinor: number;
  currency: string;
  kind: AgentRevenueKind;
  createdAt: Date;
};

export type AgentStats = {
  totalClicks: number;
  referredUsers: number;
  stores: AgentStoreDetail[];
  proStoreCount: number;
  revenueByCurrency: AgentRevenueByCurrency[];
  revenueEvents: AgentRevenueEventDetail[];
};

export type AdminAgentOverviewRow = AgentRow & {
  totalClicks: number;
  referredUsers: number;
  storeCount: number;
  proStoreCount: number;
  revenueByCurrency: AgentRevenueByCurrency[];
};

/** SQLite 聚合结果可能是 number / bigint / string，统一收口。 */
function toCount(value: unknown): number {
  return Number(value ?? 0);
}

/**
 * 单个代理商的完整统计。5 条查询并行，互不依赖。
 * 收入流水刻意不分页：代理商与流水量级都很小，现在加分页是过度设计。
 */
export async function getAgentStats(db: Db, agentId: string): Promise<AgentStats> {
  const [clickRows, referralRows, storeRows, revenueRows, eventRows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)` })
      .from(agentLinkClicks)
      .where(eq(agentLinkClicks.agentId, agentId)),
    db
      .select({ total: sql<number>`count(*)` })
      .from(agentReferrals)
      .where(eq(agentReferrals.agentId, agentId)),
    db
      .select({
        storeId: stores.id,
        name: stores.name,
        plan: stores.plan,
        createdAt: stores.createdAt,
        ownerEmail: user.email,
      })
      .from(agentReferrals)
      .innerJoin(
        storeMembers,
        and(eq(storeMembers.userId, agentReferrals.userId), eq(storeMembers.role, 'owner')),
      )
      .innerJoin(stores, and(eq(stores.id, storeMembers.storeId), eq(stores.isActive, true)))
      .innerJoin(user, eq(user.id, agentReferrals.userId))
      .where(eq(agentReferrals.agentId, agentId))
      .orderBy(desc(stores.createdAt)),
    db
      .select({
        currency: agentRevenueEvents.currency,
        totalMinor: sql<number>`coalesce(sum(${agentRevenueEvents.amountMinor}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(agentRevenueEvents)
      .where(eq(agentRevenueEvents.agentId, agentId))
      .groupBy(agentRevenueEvents.currency)
      .orderBy(agentRevenueEvents.currency),
    db
      .select({
        storeId: agentRevenueEvents.storeId,
        amountMinor: agentRevenueEvents.amountMinor,
        currency: agentRevenueEvents.currency,
        kind: agentRevenueEvents.kind,
        createdAt: agentRevenueEvents.createdAt,
      })
      .from(agentRevenueEvents)
      .where(eq(agentRevenueEvents.agentId, agentId))
      .orderBy(desc(agentRevenueEvents.createdAt)),
  ]);

  return {
    totalClicks: toCount(clickRows[0]?.total),
    referredUsers: toCount(referralRows[0]?.total),
    stores: storeRows,
    proStoreCount: storeRows.filter((row) => row.plan === 'pro').length,
    revenueByCurrency: revenueRows.map((row) => ({
      currency: row.currency,
      totalMinor: toCount(row.totalMinor),
      count: toCount(row.count),
    })),
    revenueEvents: eventRows,
  };
}

/**
 * admin 首页：每个代理商一行。
 * 固定 5 条查询后在内存里按 agentId 拼装，查询数与代理商数量无关（不 N+1）。
 */
export async function getAdminAgentOverview(db: Db): Promise<AdminAgentOverviewRow[]> {
  const [agentRows, clickRows, referralRows, storeRows, revenueRows] = await Promise.all([
    db.select().from(agents).orderBy(desc(agents.createdAt)),
    db
      .select({ agentId: agentLinkClicks.agentId, total: sql<number>`count(*)` })
      .from(agentLinkClicks)
      .groupBy(agentLinkClicks.agentId),
    db
      .select({ agentId: agentReferrals.agentId, total: sql<number>`count(*)` })
      .from(agentReferrals)
      .groupBy(agentReferrals.agentId),
    db
      .select({
        agentId: agentReferrals.agentId,
        storeCount: sql<number>`count(*)`,
        proStoreCount: sql<number>`coalesce(sum(case when ${stores.plan} = 'pro' then 1 else 0 end), 0)`,
      })
      .from(agentReferrals)
      .innerJoin(
        storeMembers,
        and(eq(storeMembers.userId, agentReferrals.userId), eq(storeMembers.role, 'owner')),
      )
      .innerJoin(stores, and(eq(stores.id, storeMembers.storeId), eq(stores.isActive, true)))
      .groupBy(agentReferrals.agentId),
    db
      .select({
        agentId: agentRevenueEvents.agentId,
        currency: agentRevenueEvents.currency,
        totalMinor: sql<number>`coalesce(sum(${agentRevenueEvents.amountMinor}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(agentRevenueEvents)
      .groupBy(agentRevenueEvents.agentId, agentRevenueEvents.currency)
      .orderBy(agentRevenueEvents.currency),
  ]);

  const clicksByAgent = new Map(clickRows.map((row) => [row.agentId, toCount(row.total)]));
  const referralsByAgent = new Map(referralRows.map((row) => [row.agentId, toCount(row.total)]));
  const storesByAgent = new Map(
    storeRows.map((row) => [
      row.agentId,
      { storeCount: toCount(row.storeCount), proStoreCount: toCount(row.proStoreCount) },
    ]),
  );

  const revenueByAgent = new Map<string, AgentRevenueByCurrency[]>();
  for (const row of revenueRows) {
    const list = revenueByAgent.get(row.agentId) ?? [];
    list.push({
      currency: row.currency,
      totalMinor: toCount(row.totalMinor),
      count: toCount(row.count),
    });
    revenueByAgent.set(row.agentId, list);
  }

  return agentRows.map((agent) => {
    const storeStats = storesByAgent.get(agent.id);
    return {
      ...agent,
      totalClicks: clicksByAgent.get(agent.id) ?? 0,
      referredUsers: referralsByAgent.get(agent.id) ?? 0,
      storeCount: storeStats?.storeCount ?? 0,
      proStoreCount: storeStats?.proStoreCount ?? 0,
      revenueByCurrency: revenueByAgent.get(agent.id) ?? [],
    };
  });
}
