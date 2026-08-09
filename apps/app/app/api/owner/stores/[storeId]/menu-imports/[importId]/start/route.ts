import { failMenuImport, MenuImportError, queueMenuImport } from '@taomenu/db';
import { getEnv } from '@/lib/cf';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; importId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, importId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  try {
    const queued = await queueMenuImport(owner.storeCtx, owner.db, importId);
    if (!queued) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
    try {
      await getEnv().AI_MENU_QUEUE.send({ importId });
    } catch (error) {
      await failMenuImport(owner.db, importId, 'QUEUE_UNAVAILABLE');
      throw error;
    }
    return Response.json({ importId, status: 'queued' }, { status: 202 });
  } catch (error) {
    if (error instanceof MenuImportError) {
      const status = error.code === 'PRO_REQUIRED' ? 403 : 409;
      return Response.json({ error: error.code }, { status });
    }
    throw error;
  }
}
