import { listActiveOrders } from '@taomenu/db';
import { isErrorResponse, requireStoreActor } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

/** MVP：店主会话查看活跃订单；后续终端凭证鉴权替代。 */
export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireStoreActor(storeId);
  if (isErrorResponse(owner)) return owner;

  const orders = await listActiveOrders(owner.storeCtx, owner.db);
  return Response.json({ orders });
}
