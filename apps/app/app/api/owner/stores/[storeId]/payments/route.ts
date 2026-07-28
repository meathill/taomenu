import { recordOrderPayment, recordSessionPayment } from '@taomenu/db';
import { recordPaymentSchema } from '@taomenu/shared';
import { badRequest, notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

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
  const parsed = recordPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  if (parsed.data.orderId) {
    const result = await recordOrderPayment(owner.storeCtx, owner.db, {
      orderId: parsed.data.orderId,
      method: parsed.data.method,
      amount: parsed.data.amount,
      note: parsed.data.note,
    });
    if (!result) return notFound();
    if ('error' in result) return badRequest(String(result.error));
    return Response.json(result, { status: 201 });
  }

  if (parsed.data.tableSessionId && parsed.data.amount !== undefined) {
    const result = await recordSessionPayment(owner.storeCtx, owner.db, {
      tableSessionId: parsed.data.tableSessionId,
      method: parsed.data.method,
      amount: parsed.data.amount,
      note: parsed.data.note,
    });
    if (!result) return notFound();
    if ('error' in result) return badRequest(String(result.error));
    return Response.json(result, { status: 201 });
  }

  return badRequest('orderId or tableSessionId+amount required');
}
