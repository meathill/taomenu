import { createCustomerOrder, findPickupPointByToken } from '@taomenu/db';
import { createOrderSchema } from '@taomenu/shared';
import { badRequest, notFound } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { scheduleOutboxProcessing } from '@/lib/push-send';

type RouteContext = { params: Promise<{ pickupToken: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { pickupToken } = await context.params;
  const db = getDb();
  const point = await findPickupPointByToken(db, pickupToken);
  if (!point) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const result = await createCustomerOrder(db, {
    storeId: point.storeId,
    fulfillmentMode: 'pickup',
    pickupPointId: point.id,
    ...parsed.data,
  });

  if (!result.ok) {
    return Response.json({ error: result.error, code: result.code }, { status: result.status });
  }

  if (!result.reused && result.outboxId) {
    scheduleOutboxProcessing(2200);
  }

  return Response.json(
    {
      orderId: result.orderId,
      publicToken: result.publicToken,
      displayNumber: result.displayNumber,
      pickupNumber: result.pickupNumber,
      subtotalAmount: result.subtotalAmount,
      status: result.status,
      reused: result.reused,
    },
    { status: result.reused ? 200 : 201 },
  );
}
