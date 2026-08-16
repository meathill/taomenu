import { MenuValidationError, reorderModifierGroups, saveModifierGroup } from '@taomenu/db';
import { createModifierGroupSchema, reorderModifierGroupsSchema } from '@taomenu/shared';
import { badRequest, notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; itemId: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  const parsed = createModifierGroupSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  try {
    const result = await saveModifierGroup(owner.storeCtx, owner.db, {
      itemId,
      ...parsed.data,
      options: parsed.data.options ?? [],
    });
    if (!result) {
      return notFound();
    }
    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof MenuValidationError) {
      return Response.json({ error: error.message, issues: error.issues }, { status: 422 });
    }
    throw error;
  }
}

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

  const parsed = reorderModifierGroupsSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const ok = await reorderModifierGroups(owner.storeCtx, owner.db, itemId, parsed.data.orderedIds);
  if (!ok) {
    return badRequest('Invalid group order');
  }
  return Response.json({ ok: true });
}
