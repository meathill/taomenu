import {
  deleteModifierGroup,
  MenuValidationError,
  saveModifierGroup,
  updateModifierGroup,
} from '@taomenu/db';
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

  try {
    const result =
      parsed.data.options !== undefined
        ? await saveModifierGroup(owner.storeCtx, owner.db, {
            groupId,
            name: parsed.data.name,
            isRequired: parsed.data.isRequired,
            minSelected: parsed.data.minSelected,
            maxSelected: parsed.data.maxSelected,
            sortOrder: parsed.data.sortOrder,
            locale: parsed.data.locale,
            options: parsed.data.options,
          })
        : await updateModifierGroup(owner.storeCtx, owner.db, groupId, parsed.data);
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
