import { duplicateItem } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; itemId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, itemId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

  const result = await duplicateItem(owner.storeCtx, owner.db, itemId);
  if (!result) {
    return notFound();
  }
  return Response.json(result, { status: 201 });
}
