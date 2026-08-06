import { getStoreIfMatches, resolveStoreContext, updateStore } from '@taomenu/db';
import { updateStoreSchema } from '@taomenu/shared';
import { badRequest, notFound, unauthorized } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/session';

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const { storeId } = await context.params;
  const db = getDb();
  const storeCtx = await resolveStoreContext(db, userId, storeId);
  if (storeCtx?.role !== 'owner') {
    return notFound();
  }

  const store = await getStoreIfMatches(storeCtx, db, storeId);
  if (!store) {
    return notFound();
  }

  return Response.json({ store });
}

export async function PUT(request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const { storeId } = await context.params;
  const db = getDb();
  const storeCtx = await resolveStoreContext(db, userId, storeId);
  if (storeCtx?.role !== 'owner') {
    return notFound();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = updateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const store = await updateStore(storeCtx, db, parsed.data);
  if (!store) {
    return notFound();
  }

  return Response.json({ store });
}
