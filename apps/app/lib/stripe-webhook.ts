/** Stripe 事件去重存储；路由注入 D1 实现，测试注入内存实现。 */
export type StripeEventDeduper = {
  claim(eventId: string): Promise<boolean>;
  release(eventId: string): Promise<void>;
};

/**
 * 幂等执行一次 webhook 处理：
 * - 重复投递直接跳过并返回 false，不再执行 handler
 * - handler 抛错时 best-effort 释放占位后原样抛出，保证 Stripe 重投能重新处理
 */
export async function handleStripeEventOnce(
  eventId: string,
  deduper: StripeEventDeduper,
  handler: () => Promise<void>,
): Promise<boolean> {
  const claimed = await deduper.claim(eventId);
  if (!claimed) return false;

  try {
    await handler();
  } catch (error) {
    await deduper.release(eventId).catch(() => undefined);
    throw error;
  }
  return true;
}
