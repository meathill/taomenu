import { getSubscriptionForStore, markSubscriptionVerified } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { isErrorResponse, requireStoreActor } from '@/lib/owner-context';

type RouteContext = {
  params: Promise<{ storeId: string; subscriptionId: string }>;
};

/** 用户点击测试通知后调用，标记「通知已验证」。 */
export async function POST(_request: Request, context: RouteContext) {
  const { storeId, subscriptionId } = await context.params;
  const owner = await requireStoreActor(storeId);
  if (isErrorResponse(owner)) return owner;

  const subscription = await getSubscriptionForStore(owner.storeCtx, owner.db, subscriptionId);
  if (
    !subscription ||
    (owner.actor.type === 'terminal' && subscription.terminalId !== owner.actor.terminalId)
  ) {
    return notFound();
  }
  const ok = await markSubscriptionVerified(owner.storeCtx, owner.db, subscriptionId);
  if (!ok) return notFound();
  return Response.json({ verified: true });
}
