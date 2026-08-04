import { rotatePickupPointToken } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; pointId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, pointId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  const pickupPoint = await rotatePickupPointToken(owner.storeCtx, owner.db, pointId);
  if (!pickupPoint) return notFound();
  return Response.json({ pickupPoint });
}
