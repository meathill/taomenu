import {
  createMenuImageEnhancement,
  failMenuImageEnhancement,
  getLatestMenuImageEnhancement,
  getMenuImageEnhancementUsage,
} from '@taomenu/db';
import { getPlanLimits } from '@taomenu/shared';
import { getEnv } from '@/lib/cf';
import { publicMediaPath } from '@/lib/menu-image';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; itemId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { storeId, itemId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  if (!getPlanLimits(owner.storeCtx.plan).canUseAiImageEnhancement) {
    return Response.json({ error: 'PRO_REQUIRED' }, { status: 403 });
  }
  const [job, usage] = await Promise.all([
    getLatestMenuImageEnhancement(owner.storeCtx, owner.db, itemId),
    getMenuImageEnhancementUsage(owner.storeCtx, owner.db),
  ]);
  return Response.json({
    job: job
      ? {
          id: job.id,
          status: job.status,
          sourceImageUrl: publicMediaPath(job.sourceImageKey),
          previewImageUrl: job.previewImageKey ? publicMediaPath(job.previewImageKey) : null,
          errorCode: job.errorCode,
        }
      : null,
    usage,
  });
}

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, itemId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  if (!getPlanLimits(owner.storeCtx.plan).canUseAiImageEnhancement) {
    return Response.json({ error: 'PRO_REQUIRED' }, { status: 403 });
  }
  try {
    const result = await createMenuImageEnhancement(owner.storeCtx, owner.db, itemId);
    try {
      await getEnv().AI_MENU_QUEUE.send({
        type: 'menu_image_enhancement',
        enhancementId: result.jobId,
      });
    } catch {
      await failMenuImageEnhancement(owner.db, result.jobId, 'QUEUE_UNAVAILABLE');
      return Response.json({ error: 'QUEUE_UNAVAILABLE' }, { status: 503 });
    }
    return Response.json(result, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : null;
    if (code) return Response.json({ error: code }, { status: 422 });
    throw error;
  }
}
