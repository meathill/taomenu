import { batchUpdateItemAvailability, createItem, MenuValidationError } from '@taomenu/db';
import { batchItemAvailabilitySchema, createItemSchema } from '@taomenu/shared';
import { badRequest, notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
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

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  try {
    const result = await createItem(owner.storeCtx, owner.db, parsed.data);
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
  const { storeId } = await context.params;
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

  const parsed = batchItemAvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const updated = await batchUpdateItemAvailability(owner.storeCtx, owner.db, parsed.data);
  return Response.json({ updated });
}
