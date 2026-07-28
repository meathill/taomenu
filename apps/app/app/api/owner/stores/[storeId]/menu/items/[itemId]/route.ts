import { deleteItem, MenuValidationError, updateItem } from '@taomenu/db';
import { updateItemSchema } from '@taomenu/shared';
import { badRequest, notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; itemId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, itemId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  try {
    const result = await updateItem(owner.storeCtx, owner.db, itemId, parsed.data);
    if (!result) {
      return notFound();
    }
    return Response.json(result);
  } catch (error) {
    if (error instanceof MenuValidationError) {
      return Response.json({ error: error.message, issues: error.issues }, { status: 422 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { storeId, itemId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

  const ok = await deleteItem(owner.storeCtx, owner.db, itemId);
  if (!ok) {
    return notFound();
  }
  return Response.json({ ok: true });
}
