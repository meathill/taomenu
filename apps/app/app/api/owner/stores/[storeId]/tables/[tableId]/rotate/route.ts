import { rotateDiningTableToken } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; tableId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, tableId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const table = await rotateDiningTableToken(owner.storeCtx, owner.db, tableId);
  if (!table) return notFound();
  return Response.json({ table });
}
