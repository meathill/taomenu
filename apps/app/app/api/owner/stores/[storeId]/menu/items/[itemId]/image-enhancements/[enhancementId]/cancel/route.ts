import { cancelMenuImageEnhancement } from '@taomenu/db';
import { getEnv } from '@/lib/cf';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = {
  params: Promise<{ storeId: string; itemId: string; enhancementId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, itemId, enhancementId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  try {
    const result = await cancelMenuImageEnhancement(
      owner.storeCtx,
      owner.db,
      itemId,
      enhancementId,
    );
    if (result.previewImageKey) {
      await getEnv()
        .MEDIA?.delete(result.previewImageKey)
        .catch(() => undefined);
    }
    return Response.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : null;
    if (code) return Response.json({ error: code }, { status: 422 });
    throw error;
  }
}
