import { isErrorResponse, requireStoreActor } from '@/lib/owner-context';
import { getVapidPublicKey, isPushConfigured } from '@/lib/push-send';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireStoreActor(storeId);
  if (isErrorResponse(owner)) return owner;

  if (!isPushConfigured()) {
    return Response.json({ configured: false, publicKey: null });
  }
  return Response.json({ configured: true, publicKey: getVapidPublicKey() });
}
