import { closeTableSession } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { isErrorResponse, requireStoreActor } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; sessionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, sessionId } = await context.params;
  const owner = await requireStoreActor(storeId);
  if (isErrorResponse(owner)) return owner;

  const result = await closeTableSession(owner.storeCtx, owner.db, sessionId);
  if (!result) return notFound();
  if ('error' in result) {
    return Response.json(result, { status: 400 });
  }
  return Response.json(result);
}
