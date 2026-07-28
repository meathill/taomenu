import { enqueueNotification, getSubscriptionForStore, processOneOutboxEvent } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';
import { createPushSender, isPushConfigured } from '@/lib/push-send';

type RouteContext = {
  params: Promise<{ storeId: string; subscriptionId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, subscriptionId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  if (!isPushConfigured()) {
    return Response.json({ error: 'Push not configured' }, { status: 503 });
  }

  const sub = await getSubscriptionForStore(owner.storeCtx, owner.db, subscriptionId);
  if (!sub || sub.disabledAt) {
    return notFound();
  }

  const eventId = await enqueueNotification(owner.db, {
    storeId,
    eventType: 'push.test',
    entityId: subscriptionId,
    delayMs: 0,
  });

  const result = await processOneOutboxEvent(owner.db, eventId, createPushSender());
  return Response.json({ eventId, result });
}
