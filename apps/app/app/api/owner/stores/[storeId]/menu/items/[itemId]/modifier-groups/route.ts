import { createModifierGroup } from '@taomenu/db';
import { createModifierGroupSchema } from '@taomenu/shared';
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

  const result = await createModifierGroup(owner.storeCtx, owner.db, {
    itemId,
    ...parsed.data,
  });
  if (!result) {
    return notFound();
  }
  return Response.json(result, { status: 201 });
}
