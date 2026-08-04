import { getOwnerOverview, getStore } from '@taomenu/db';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const store = await getStore(owner.storeCtx, owner.db);
  if (!store) {
    return Response.json({ error: 'Store not found' }, { status: 404 });
  }
  const overview = await getOwnerOverview(owner.storeCtx, owner.db, store.timezone);
  return Response.json(overview);
}
