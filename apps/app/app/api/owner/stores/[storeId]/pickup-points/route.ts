import { createPickupPoint, listPickupPoints } from '@taomenu/db';
import { createPickupPointSchema } from '@taomenu/shared';
import { badRequest } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  const points = await listPickupPoints(owner.storeCtx, owner.db);
  return Response.json({ pickupPoints: points });
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = createPickupPointSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const pickupPoint = await createPickupPoint(owner.storeCtx, owner.db, parsed.data);
  return Response.json({ pickupPoint }, { status: 201 });
}
