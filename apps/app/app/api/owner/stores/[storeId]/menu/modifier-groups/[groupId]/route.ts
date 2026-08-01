import { deleteModifierGroup, updateModifierGroup } from '@taomenu/db';
import { updateModifierGroupSchema } from '@taomenu/shared';
import { badRequest, notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; groupId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, groupId } = await context.params;
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

  const parsed = updateModifierGroupSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const result = await updateModifierGroup(owner.storeCtx, owner.db, groupId, parsed.data);
  if (!result) {
    return notFound();
  }
  return Response.json(result);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { storeId, groupId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

  const ok = await deleteModifierGroup(owner.storeCtx, owner.db, groupId);
  if (!ok) {
    return notFound();
  }
  return Response.json({ ok: true });
}
