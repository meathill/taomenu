import { listOpenServiceRequests } from '@taomenu/db';
import { isErrorResponse, requireStoreActor } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireStoreActor(storeId);
  if (isErrorResponse(owner)) return owner;
  const requests = await listOpenServiceRequests(owner.storeCtx, owner.db);
  return Response.json({ requests });
}
