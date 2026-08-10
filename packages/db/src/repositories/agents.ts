/**
 * 代理商 / admin 是**显式跨租户域**：本文件所有函数以 db 为首参，不走 StoreContext
 * （先例见 stripe-webhook-events.ts）。代理商要看的就是自己名下所有商家的汇总，
 * 天然没有单一门店上下文。
 *
 * 鉴权在 API / 页面层由 requireAdmin / requireAgent 完成，本文件不做任何权限判断。
 */

import { and, desc, eq } from 'drizzle-orm';
import type { AgentClickSource, AgentRevenueKind, AgentStatus } from '../schema/agents';
import { agentLinkClicks, agentReferrals, agentRevenueEvents, agents } from '../schema/agents';
import { storeMembers } from '../schema/stores';
import { nowMs } from '../time';
import type { Db } from '../types';

export type { AgentClickSource, AgentRevenueKind, AgentStatus } from '../schema/agents';

export type AgentRow = typeof agents.$inferSelect;
export type AgentReferralRow = typeof agentReferrals.$inferSelect;
export type AgentLinkClickRow = typeof agentLinkClicks.$inferSelect;
export type AgentRevenueEventRow = typeof agentRevenueEvents.$inferSelect;

/** 8 位推广码字符集：大写字母 + 数字，去掉易混淆的 0 / O / 1 / I，正好 32 个。 */
const AGENT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AGENT_CODE_LENGTH = 8;
const AGENT_CODE_MAX_ATTEMPTS = 5;

/**
 * 生成 8 位推广码，约 40 bit 熵。
 * 字符集长度 32 且 256 % 32 === 0，所以直接取模不会引入偏差——别改成非 2 的幂长度。
 */
export function generateAgentCode(): string {
  const bytes = new Uint8Array(AGENT_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const byte of bytes) {
    code += AGENT_CODE_ALPHABET[byte % AGENT_CODE_ALPHABET.length];
  }
  return code;
}

/** email 统一 trim + 小写，agent 与 user 之间靠它匹配。 */
export function normalizeAgentEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** 推广码统一 trim + 大写，URL 里大小写随意都能命中。 */
export function normalizeAgentCode(code: string): string {
  return code.trim().toUpperCase();
}

export type CreateAgentInput = {
  name: string;
  email: string;
};

export type CreateAgentResult =
  | { agent: AgentRow; error?: never }
  | { agent?: never; error: 'EMAIL_TAKEN' };

async function emailExists(db: Db, email: string): Promise<boolean> {
  const rows = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.email, email))
    .limit(1);
  return Boolean(rows[0]);
}

/**
 * 创建代理商。email 冲突返回 EMAIL_TAKEN，code 冲突内部重试。
 * insert 不指定 onConflict target，code 与 email 两个唯一索引都会命中 DO NOTHING，
 * 因此插入落空后要复查 email 才能区分是并发 email 冲突还是 code 撞车。
 */
export async function createAgent(db: Db, input: CreateAgentInput): Promise<CreateAgentResult> {
  const email = normalizeAgentEmail(input.email);
  const name = input.name.trim();

  if (await emailExists(db, email)) {
    return { error: 'EMAIL_TAKEN' };
  }

  for (let attempt = 0; attempt < AGENT_CODE_MAX_ATTEMPTS; attempt++) {
    const createdAt = nowMs();
    const row: typeof agents.$inferInsert = {
      id: crypto.randomUUID(),
      code: generateAgentCode(),
      name,
      email,
      status: 'active',
      createdAt,
      updatedAt: createdAt,
    };

    const inserted = await db.insert(agents).values(row).onConflictDoNothing().returning();
    const created = inserted[0];
    if (created) {
      return { agent: created };
    }

    if (await emailExists(db, email)) {
      return { error: 'EMAIL_TAKEN' };
    }
  }

  throw new Error('AGENT_CODE_ALLOCATION_FAILED');
}

export async function listAgents(db: Db): Promise<AgentRow[]> {
  return db.select().from(agents).orderBy(desc(agents.createdAt));
}

export async function getAgentById(db: Db, id: string): Promise<AgentRow | null> {
  const rows = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return rows[0] ?? null;
}

/** 改状态并推进 updated_at；id 不存在返回 null。 */
export async function setAgentStatus(
  db: Db,
  id: string,
  status: AgentStatus,
): Promise<AgentRow | null> {
  const updated = await db
    .update(agents)
    .set({ status, updatedAt: nowMs() })
    .where(eq(agents.id, id))
    .returning();
  return updated[0] ?? null;
}

/** 只返回 active：禁用的代理商不能登录后台。 */
export async function findActiveAgentByEmail(db: Db, email: string): Promise<AgentRow | null> {
  const rows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.email, normalizeAgentEmail(email)), eq(agents.status, 'active')))
    .limit(1);
  return rows[0] ?? null;
}

/** 只返回 active：禁用的代理商推广链接立即失效，不再产生点击与归因。 */
export async function findActiveAgentByCode(db: Db, code: string): Promise<AgentRow | null> {
  const rows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.code, normalizeAgentCode(code)), eq(agents.status, 'active')))
    .limit(1);
  return rows[0] ?? null;
}

export type RecordAgentClickInput = {
  code: string;
  source: AgentClickSource;
  visitorHash: string;
  /** UTC 'YYYY-MM-DD'，由调用方保证格式。 */
  day: string;
};

/**
 * 记录一次推广链接点击。code 无效或代理商已禁用时静默丢弃——
 * 这是公开上报入口，不能因为一个乱填的 ref 就报错，也不该泄露 code 是否存在。
 * 同 (agent, day, visitor) 的重复点击交给唯一索引去重。
 * 返回是否新落了一行。
 */
export async function recordAgentClick(db: Db, input: RecordAgentClickInput): Promise<boolean> {
  const agent = await findActiveAgentByCode(db, input.code);
  if (!agent) {
    return false;
  }

  const inserted = await db
    .insert(agentLinkClicks)
    .values({
      id: crypto.randomUUID(),
      agentId: agent.id,
      source: input.source,
      day: input.day,
      visitorHash: input.visitorHash,
      createdAt: nowMs(),
    })
    .onConflictDoNothing()
    .returning({ id: agentLinkClicks.id });

  return inserted.length > 0;
}

export type AttributeUserInput = {
  userId: string;
  code: string;
};

/**
 * 注册时写入 user 级归因。首触优先：user_id 是主键，
 * 已有归因时冲突 DO NOTHING，第二个代理商永远抢不走。
 * code 无效 / 代理商已禁用时静默跳过，绝不阻断注册流程。
 * ref_code 存代理商当前 code 的快照，而不是原始入参，避免大小写与空格污染统计。
 * 返回是否新建了归因。
 */
export async function attributeUserToAgent(db: Db, input: AttributeUserInput): Promise<boolean> {
  const agent = await findActiveAgentByCode(db, input.code);
  if (!agent) {
    return false;
  }

  const inserted = await db
    .insert(agentReferrals)
    .values({
      userId: input.userId,
      agentId: agent.id,
      refCode: agent.code,
      attributedAt: nowMs(),
    })
    .onConflictDoNothing()
    .returning({ userId: agentReferrals.userId });

  return inserted.length > 0;
}

export type RecordAgentRevenueInput = {
  storeId: string;
  stripeInvoiceId: string;
  amountMinor: number;
  currency: string;
  kind: AgentRevenueKind;
};

/**
 * 把一笔已支付的 invoice 记到归因代理商名下。
 * 路径：store_members(role='owner') → agent_referrals → agent。
 * 无 owner 或该 owner 无归因时静默跳过——绝大多数商家本来就不来自代理商。
 *
 * 刻意不校验代理商是否 active：status='active' 只控制「新归因」与「后台登录」，
 * 代理商被禁用后，其名下既有商家的续费仍是既成事实，必须继续记账作为结算依据。
 *
 * stripe_invoice_id 唯一索引 + 外层 handleStripeEventOnce 构成幂等双保险。
 * 返回是否新落了一行。
 */
export async function recordAgentRevenueForStore(
  db: Db,
  input: RecordAgentRevenueInput,
): Promise<boolean> {
  const owners = await db
    .select({ agentId: agentReferrals.agentId, userId: agentReferrals.userId })
    .from(storeMembers)
    .innerJoin(agentReferrals, eq(agentReferrals.userId, storeMembers.userId))
    .where(and(eq(storeMembers.storeId, input.storeId), eq(storeMembers.role, 'owner')))
    .limit(1);

  const owner = owners[0];
  if (!owner) {
    return false;
  }

  const inserted = await db
    .insert(agentRevenueEvents)
    .values({
      id: crypto.randomUUID(),
      agentId: owner.agentId,
      storeId: input.storeId,
      userId: owner.userId,
      stripeInvoiceId: input.stripeInvoiceId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      kind: input.kind,
      createdAt: nowMs(),
    })
    .onConflictDoNothing()
    .returning({ id: agentRevenueEvents.id });

  return inserted.length > 0;
}
