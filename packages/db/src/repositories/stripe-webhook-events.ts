import { eq } from 'drizzle-orm';
import { stripeWebhookEvents } from '../schema';
import type { Db } from '../types';

/**
 * 占位一个 Stripe 事件 id。与计费写入一样不走 StoreContext：
 * 事件由 Stripe 直接投递，没有已鉴权的门店上下文。
 * 返回 true 表示首次投递，false 表示重复投递（主键冲突）。
 */
export async function claimStripeWebhookEvent(db: Db, eventId: string): Promise<boolean> {
  const inserted = await db
    .insert(stripeWebhookEvents)
    .values({ eventId, receivedAt: new Date() })
    .onConflictDoNothing()
    .returning({ eventId: stripeWebhookEvents.eventId });
  return inserted.length > 0;
}

/** 处理失败时释放占位，让 Stripe 重投时能重新处理。 */
export async function releaseStripeWebhookEvent(db: Db, eventId: string): Promise<void> {
  await db.delete(stripeWebhookEvents).where(eq(stripeWebhookEvents.eventId, eventId));
}
