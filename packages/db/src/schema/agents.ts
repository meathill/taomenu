import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth';

export const AGENT_STATUSES = ['active', 'disabled'] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_CLICK_SOURCES = ['website', 'app'] as const;
export type AgentClickSource = (typeof AGENT_CLICK_SOURCES)[number];

export const AGENT_REVENUE_KINDS = ['pro_plan', 'staff_seats', 'unknown'] as const;
export type AgentRevenueKind = (typeof AGENT_REVENUE_KINDS)[number];

/**
 * 代理商。由 admin 手动创建，email 统一小写存储，
 * 登录时用 session email 与本表匹配（不建 userId 外键：创建时对方可能从未登录过）。
 */
export const agents = sqliteTable(
  'agents',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    status: text('status').notNull().$type<AgentStatus>().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('agents_code_unique').on(table.code),
    uniqueIndex('agents_email_unique').on(table.email),
  ],
);

/**
 * user 级归因，首触优先不覆盖：user_id 作主键即是首触保证，
 * 重复归因靠主键冲突 onConflictDoNothing 挡掉。
 * ref_code 是归因发生时代理商 code 的快照，便于日后对账。
 */
export const agentReferrals = sqliteTable(
  'agent_referrals',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    refCode: text('ref_code').notNull(),
    attributedAt: integer('attributed_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('agent_referrals_agent_idx').on(table.agentId)],
);

/**
 * 推广链接点击。day 是 UTC 的 'YYYY-MM-DD'，
 * visitor_hash = sha256(ip|ua|day|code)，不存原始 IP / UA。
 * 同一 (agent, day, visitor) 只计一次，去重完全交给唯一索引。
 */
export const agentLinkClicks = sqliteTable(
  'agent_link_clicks',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    source: text('source').notNull().$type<AgentClickSource>(),
    day: text('day').notNull(),
    visitorHash: text('visitor_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('agent_link_clicks_dedupe_unique').on(table.agentId, table.day, table.visitorHash),
  ],
);

/**
 * 归因商家的订阅收入流水（来自 Stripe invoice.paid）。
 * store_id / user_id 刻意不加外键：流水是审计记录，门店注销后仍需留痕。
 * stripe_invoice_id 唯一，与 webhook 外层去重构成幂等双保险。
 */
export const agentRevenueEvents = sqliteTable(
  'agent_revenue_events',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    storeId: text('store_id').notNull(),
    userId: text('user_id').notNull(),
    stripeInvoiceId: text('stripe_invoice_id').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    kind: text('kind').notNull().$type<AgentRevenueKind>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('agent_revenue_events_invoice_unique').on(table.stripeInvoiceId),
    index('agent_revenue_events_agent_idx').on(table.agentId),
  ],
);
