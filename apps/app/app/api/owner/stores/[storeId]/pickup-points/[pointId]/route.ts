import { updatePickupPoint } from '@taomenu/db';
import { z } from 'zod';
import { badRequest, notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ storeId: string; pointId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, pointId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  const pickupPoint = await updatePickupPoint(owner.storeCtx, owner.db, pointId, parsed.data);
  if (!pickupPoint) return notFound();
  return Response.json({ pickupPoint });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { storeId, pointId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  const pickupPoint = await updatePickupPoint(owner.storeCtx, owner.db, pointId, {
    isActive: false,
  });
  if (!pickupPoint) return notFound();
  return Response.json({ pickupPoint });
}
