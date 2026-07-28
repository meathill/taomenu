import { and, eq, isNull, lt, lte, or } from 'drizzle-orm';
import {
  type NotificationEventType,
  notificationDeliveries,
  notificationOutbox,
  type PushSubjectType,
  pushSubscriptions,
} from '../schema/push';
import { orders } from '../schema/tables-orders';
import type { Db, StoreContext } from '../types';

function nowMs(): Date {
  return new Date();
}

export type SaveSubscriptionInput = {
  subjectType: PushSubjectType;
  userId?: string | null;
  terminalId?: string | null;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  platform?: string | null;
  userAgent?: string | null;
};

/** 按 endpoint upsert，归属当前门店。 */
export async function upsertPushSubscription(
  ctx: StoreContext,
  db: Db,
  input: SaveSubscriptionInput,
) {
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.endpoint))
    .limit(1);

  const now = nowMs();

  if (existing[0]) {
    if (existing[0].storeId !== ctx.storeId) {
      // 旧 endpoint 被别的店占用：改绑到当前店（设备换店）
    }
    await db
      .update(pushSubscriptions)
      .set({
        storeId: ctx.storeId,
        subjectType: input.subjectType,
        userId: input.userId ?? existing[0].userId,
        terminalId: input.terminalId ?? existing[0].terminalId,
        p256dhKey: input.p256dhKey,
        authKey: input.authKey,
        platform: input.platform ?? existing[0].platform,
        userAgent: input.userAgent ?? existing[0].userAgent,
        disabledAt: null,
      })
      .where(eq(pushSubscriptions.id, existing[0].id));
    return { id: existing[0].id, reused: true as const };
  }

  const id = crypto.randomUUID();
  await db.insert(pushSubscriptions).values({
    id,
    storeId: ctx.storeId,
    subjectType: input.subjectType,
    terminalId: input.terminalId ?? null,
    userId: input.userId ?? null,
    endpoint: input.endpoint,
    p256dhKey: input.p256dhKey,
    authKey: input.authKey,
    platform: input.platform ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: now,
    lastSuccessAt: null,
    verifiedAt: null,
    disabledAt: null,
  });
  return { id, reused: false as const };
}

export async function listActiveSubscriptions(db: Db, storeId: string) {
  return db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.storeId, storeId), isNull(pushSubscriptions.disabledAt)));
}

export async function disableSubscription(db: Db, subscriptionId: string) {
  await db
    .update(pushSubscriptions)
    .set({ disabledAt: nowMs() })
    .where(eq(pushSubscriptions.id, subscriptionId));
}

export async function markSubscriptionVerified(ctx: StoreContext, db: Db, subscriptionId: string) {
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(eq(pushSubscriptions.id, subscriptionId), eq(pushSubscriptions.storeId, ctx.storeId)),
    )
    .limit(1);
  if (!rows[0] || rows[0].disabledAt) {
    return false;
  }
  const now = nowMs();
  await db
    .update(pushSubscriptions)
    .set({ verifiedAt: now, lastSuccessAt: now })
    .where(eq(pushSubscriptions.id, subscriptionId));
  return true;
}

export async function getSubscriptionForStore(ctx: StoreContext, db: Db, subscriptionId: string) {
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(eq(pushSubscriptions.id, subscriptionId), eq(pushSubscriptions.storeId, ctx.storeId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function enqueueNotification(
  db: Db,
  input: {
    storeId: string;
    eventType: NotificationEventType;
    entityId: string;
    payload?: Record<string, unknown>;
    /** 延迟发送（ms），用于「仍为 submitted 再推」 */
    delayMs?: number;
  },
) {
  const id = crypto.randomUUID();
  const now = nowMs();
  const notBefore = new Date(now.getTime() + (input.delayMs ?? 0));
  await db.insert(notificationOutbox).values({
    id,
    storeId: input.storeId,
    eventType: input.eventType,
    entityId: input.entityId,
    payloadJson: input.payload ? JSON.stringify(input.payload) : null,
    notBefore,
    status: 'pending',
    attempts: 0,
    lastError: null,
    createdAt: now,
    processedAt: null,
  });
  return id;
}

export type PushSendResult = {
  ok: boolean;
  statusCode: number;
  permanentFailure: boolean;
};

export type PushSender = (input: {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  payload: Record<string, unknown>;
}) => Promise<PushSendResult>;

/**
 * 处理到期 outbox：检查订单仍 submitted（新单）后，向门店有效 subscription 发 Push。
 * Queue 未接入前由请求路径/定时扫触发。
 */
export async function processDueOutbox(db: Db, send: PushSender, limit = 20) {
  const now = nowMs();
  const events = await db
    .select()
    .from(notificationOutbox)
    .where(
      and(
        or(eq(notificationOutbox.status, 'pending'), eq(notificationOutbox.status, 'failed')),
        lte(notificationOutbox.notBefore, now),
        lt(notificationOutbox.attempts, 5),
      ),
    )
    .limit(limit);

  let processed = 0;
  for (const event of events) {
    await processOneOutboxEvent(db, event.id, send);
    processed += 1;
  }
  return { processed };
}

export async function processOneOutboxEvent(db: Db, eventId: string, send: PushSender) {
  const rows = await db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.id, eventId))
    .limit(1);
  const event = rows[0];
  if (!event) return { skipped: true as const };

  const now = nowMs();
  await db
    .update(notificationOutbox)
    .set({
      status: 'processing',
      attempts: event.attempts + 1,
    })
    .where(eq(notificationOutbox.id, eventId));

  if (event.eventType === 'order.submitted') {
    const orderRows = await db
      .select({ status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, event.entityId), eq(orders.storeId, event.storeId)))
      .limit(1);
    const order = orderRows[0];
    if (order?.status !== 'submitted') {
      await db
        .update(notificationOutbox)
        .set({ status: 'completed', processedAt: now, lastError: 'order_not_submitted' })
        .where(eq(notificationOutbox.id, eventId));
      return { skipped: true as const, reason: 'order_not_submitted' as const };
    }
  }

  const subscriptions = await listActiveSubscriptions(db, event.storeId);
  if (subscriptions.length === 0) {
    await db
      .update(notificationOutbox)
      .set({ status: 'completed', processedAt: now, lastError: 'no_subscriptions' })
      .where(eq(notificationOutbox.id, eventId));
    return { skipped: true as const, reason: 'no_subscriptions' as const };
  }

  const payload = buildPayload(event);
  let anySent = false;
  let lastError: string | null = null;

  for (const sub of subscriptions) {
    if (event.eventType === 'push.test' && event.entityId !== sub.id) {
      continue;
    }

    const result = await send({
      endpoint: sub.endpoint,
      p256dhKey: sub.p256dhKey,
      authKey: sub.authKey,
      payload,
    });

    const deliveryId = crypto.randomUUID();
    const existingDelivery = await db
      .select({ id: notificationDeliveries.id })
      .from(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.eventId, eventId),
          eq(notificationDeliveries.subscriptionId, sub.id),
        ),
      )
      .limit(1);

    if (existingDelivery[0] && result.ok) {
      anySent = true;
      continue;
    }

    const deliveryStatus = result.permanentFailure
      ? ('gone' as const)
      : result.ok
        ? ('sent' as const)
        : ('failed' as const);

    if (existingDelivery[0]) {
      const prev = await db
        .select({ attempts: notificationDeliveries.attempts })
        .from(notificationDeliveries)
        .where(eq(notificationDeliveries.id, existingDelivery[0].id))
        .limit(1);
      await db
        .update(notificationDeliveries)
        .set({
          status: deliveryStatus,
          responseCode: result.statusCode,
          attempts: (prev[0]?.attempts ?? 0) + 1,
          lastAttemptAt: now,
          deliveredAt: result.ok ? now : null,
        })
        .where(eq(notificationDeliveries.id, existingDelivery[0].id));
    } else {
      await db.insert(notificationDeliveries).values({
        id: deliveryId,
        eventId,
        subscriptionId: sub.id,
        status: deliveryStatus,
        responseCode: result.statusCode,
        attempts: 1,
        lastAttemptAt: now,
        deliveredAt: result.ok ? now : null,
      });
    }

    if (result.ok) {
      anySent = true;
      await db
        .update(pushSubscriptions)
        .set({ lastSuccessAt: now })
        .where(eq(pushSubscriptions.id, sub.id));
    } else if (result.permanentFailure) {
      await disableSubscription(db, sub.id);
      lastError = `gone:${sub.id}:${result.statusCode}`;
    } else {
      lastError = `fail:${sub.id}:${result.statusCode}`;
    }
  }

  await db
    .update(notificationOutbox)
    .set({
      status: anySent || event.eventType === 'push.test' ? 'completed' : 'failed',
      processedAt: now,
      lastError,
    })
    .where(eq(notificationOutbox.id, eventId));

  return { skipped: false as const, anySent };
}

function buildPayload(event: typeof notificationOutbox.$inferSelect): Record<string, unknown> {
  const base =
    event.payloadJson != null ? (JSON.parse(event.payloadJson) as Record<string, unknown>) : {};

  if (event.eventType === 'order.submitted') {
    return {
      type: 'order.submitted',
      title: 'TaoMenu',
      body: 'Có đơn hàng mới',
      url: '/terminal',
      orderId: event.entityId,
      tag: `order-${event.entityId}`,
      ...base,
    };
  }
  if (event.eventType === 'push.test') {
    return {
      type: 'push.test',
      title: 'TaoMenu',
      body: 'Thông báo thử nghiệm — chạm để xác nhận',
      url: `/terminal?push_verify=${event.entityId}`,
      subscriptionId: event.entityId,
      tag: `push-test-${event.entityId}`,
      ...base,
    };
  }
  return {
    type: event.eventType,
    title: 'TaoMenu',
    body: 'Có cập nhật mới',
    url: '/terminal',
    ...base,
  };
}

/** 新订单：写入 outbox（默认 2s 后投递，避免已接单仍推）。 */
export async function enqueueOrderSubmittedNotification(db: Db, storeId: string, orderId: string) {
  return enqueueNotification(db, {
    storeId,
    eventType: 'order.submitted',
    entityId: orderId,
    delayMs: 2000,
  });
}
