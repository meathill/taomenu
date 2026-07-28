import { createCustomerOrder, findDiningTableByToken } from '@taomenu/db';
import { createOrderSchema } from '@taomenu/shared';
import { badRequest, notFound } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { scheduleOutboxProcessing } from '@/lib/push-send';

type RouteContext = { params: Promise<{ tableToken: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { tableToken } = await context.params;
  const db = getDb();
  const table = await findDiningTableByToken(db, tableToken);
  if (!table) return notFound();

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
    storeId: table.storeId,
    fulfillmentMode: 'dine_in',
    tableId: table.id,
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
      subtotalAmount: result.subtotalAmount,
      status: result.status,
      reused: result.reused,
    },
    { status: result.reused ? 200 : 201 },
  );
}
