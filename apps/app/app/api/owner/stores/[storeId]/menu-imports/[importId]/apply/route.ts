import { applyMenuImport, getMenuImportJob, MenuImportError } from '@taomenu/db';
import { getEnv } from '@/lib/cf';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; importId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, importId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  try {
    const result = await applyMenuImport(owner.storeCtx, owner.db, importId);
    const job = await getMenuImportJob(owner.db, importId);
    if (job?.menuImport.storeId === storeId) {
      await Promise.all(
        job.assets.map((asset) =>
          getEnv()
            .MEDIA.delete(asset.r2Key)
            .catch(() => undefined),
        ),
      );
    }
    return Response.json(result);
  } catch (error) {
    if (error instanceof MenuImportError) {
      const status = error.code === 'PRO_REQUIRED' ? 403 : 409;
      return Response.json({ error: error.code }, { status });
    }
    throw error;
  }
}
