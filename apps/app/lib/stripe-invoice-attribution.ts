/**
 * Stripe webhook 负载读取工具 + `invoice.paid` 的代理商收入归因纯逻辑。
 * 全部是纯函数，不碰 DB，方便直接单测；DB 那一段留在 webhook route 里。
 */

import type { AgentRevenueKind } from '@taomenu/db';

export type StripeObject = Record<string, unknown>;

/** Stripe 负载里的关联字段可能缺失、可能是展开后的对象，只接受非空字符串（即 id）。 */
export function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * invoice 上订阅 id 的位置随 API 版本迁移过：
 * 老版直接挂在 `subscription`，新版挪进了 `parent.subscription_details.subscription`。
 * 两处都读，谁先命中用谁。
 */
export function readInvoiceSubscriptionId(object: StripeObject): string | null {
  const direct = readString(object.subscription);
  if (direct) {
    return direct;
  }

  const parent = object.parent;
  if (!parent || typeof parent !== 'object') {
    return null;
  }
  const details = (parent as StripeObject).subscription_details;
  if (!details || typeof details !== 'object') {
    return null;
  }
  return readString((details as StripeObject).subscription);
}

export type PaidInvoice = {
  stripeInvoiceId: string;
  stripeCustomerId: string;
  amountMinor: number;
  currency: string;
  subscriptionId: string | null;
};

/**
 * 解析一张「值得记账」的已支付发票。返回 null 表示直接跳过：
 * - amount_paid ≤ 0：trial / 0 元发票，没有收入可归因
 * - 缺 id / customer / currency：invoice 上没有 metadata.storeId，customer 是唯一稳定的关联键
 *
 * 刻意放在任何 DB 查询之前，避免为 0 元发票白跑一次 D1。
 */
export function parsePaidInvoice(object: StripeObject): PaidInvoice | null {
  const amountMinor = typeof object.amount_paid === 'number' ? object.amount_paid : 0;
  if (amountMinor <= 0) {
    return null;
  }

  const stripeInvoiceId = readString(object.id);
  const stripeCustomerId = readString(object.customer);
  const currency = readString(object.currency);
  if (!stripeInvoiceId || !stripeCustomerId || !currency) {
    return null;
  }

  return {
    stripeInvoiceId,
    stripeCustomerId,
    amountMinor,
    currency,
    subscriptionId: readInvoiceSubscriptionId(object),
  };
}

/** 归因只需要 store 的这几个字段；StoreRow 结构上满足。 */
export type AgentRevenueStore = {
  stripePlanSubscriptionId: string | null;
  stripeStaffSeatSubscriptionId: string | null;
};

/** 与门店记录的两个订阅 id 比对定性；对不上（如一次性发票、历史订阅）记 'unknown'，仍然计入收入。 */
export function resolveAgentRevenueKind(
  subscriptionId: string | null,
  store: AgentRevenueStore,
): AgentRevenueKind {
  if (!subscriptionId) {
    return 'unknown';
  }
  if (subscriptionId === store.stripePlanSubscriptionId) {
    return 'pro_plan';
  }
  if (subscriptionId === store.stripeStaffSeatSubscriptionId) {
    return 'staff_seats';
  }
  return 'unknown';
}
