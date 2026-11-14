import { discardMenuImport, getMenuImportJob, MenuImportError } from '@taomenu/db';
import { getPlanLimits } from '@taomenu/shared';
import { getEnv } from '@/lib/cf';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; importId: string }> };

/** 放弃当前导入草稿，回到上传状态（issue #29）；只能操作本店的导入，放弃不占额度 */
export async function POST(_request: Request, context: RouteContext) {
  const { storeId, importId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  if (!getPlanLimits(owner.storeCtx.plan).canUseAiMenuImport) {
    return Response.json({ error: 'PRO_REQUIRED' }, { status: 403 });
  }
  try {
    const result = await discardMenuImport(owner.storeCtx, owner.db, importId);
    if (!result) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
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
