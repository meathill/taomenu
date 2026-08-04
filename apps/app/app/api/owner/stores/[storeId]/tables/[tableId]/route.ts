import { updateDiningTable } from '@taomenu/db';
import { z } from 'zod';
import { badRequest, notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ storeId: string; tableId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, tableId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  const table = await updateDiningTable(owner.storeCtx, owner.db, tableId, parsed.data);
  if (!table) return notFound();
  return Response.json({ table });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { storeId, tableId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  const table = await updateDiningTable(owner.storeCtx, owner.db, tableId, { isActive: false });
  if (!table) return notFound();
  return Response.json({ table });
}
