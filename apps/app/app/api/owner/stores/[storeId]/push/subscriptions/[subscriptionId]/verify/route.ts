import { markSubscriptionVerified } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = {
  params: Promise<{ storeId: string; subscriptionId: string }>;
};

/** 用户点击测试通知后调用，标记「通知已验证」。 */
export async function POST(_request: Request, context: RouteContext) {
  const { storeId, subscriptionId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const ok = await markSubscriptionVerified(owner.storeCtx, owner.db, subscriptionId);
  if (!ok) return notFound();
  return Response.json({ verified: true });
}
