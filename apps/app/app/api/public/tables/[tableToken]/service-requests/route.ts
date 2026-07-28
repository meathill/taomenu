import { createServiceRequest, findDiningTableByToken } from '@taomenu/db';
import { createServiceRequestSchema } from '@taomenu/shared';
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
  const parsed = createServiceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const result = await createServiceRequest(db, {
    storeId: table.storeId,
    tableId: table.id,
    type: parsed.data.type,
    idempotencyKey: parsed.data.idempotencyKey,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.error, code: 'code' in result ? result.code : undefined },
      { status: result.status },
    );
  }

  if (!result.reused) {
    scheduleOutboxProcessing(0);
  }

  return Response.json(
    {
      id: result.id,
      publicToken: result.publicToken,
      status: result.status,
      type: result.type,
      reused: result.reused,
    },
    { status: result.reused ? 200 : 201 },
  );
}
