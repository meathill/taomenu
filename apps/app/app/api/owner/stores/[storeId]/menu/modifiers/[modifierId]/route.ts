import { deleteModifier, updateModifier } from '@taomenu/db';
import { updateModifierSchema } from '@taomenu/shared';
import { badRequest, notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; modifierId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, modifierId } = await context.params;
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

  const parsed = updateModifierSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const result = await updateModifier(owner.storeCtx, owner.db, modifierId, parsed.data);
  if (!result) {
    return notFound();
  }
  return Response.json(result);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { storeId, modifierId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

  const ok = await deleteModifier(owner.storeCtx, owner.db, modifierId);
  if (!ok) {
    return notFound();
  }
  return Response.json({ ok: true });
}
