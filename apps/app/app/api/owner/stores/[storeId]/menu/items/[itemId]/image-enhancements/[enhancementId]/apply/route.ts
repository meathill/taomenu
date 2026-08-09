import { applyMenuImageEnhancement } from '@taomenu/db';
import { publicMediaPath } from '@/lib/menu-image';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = {
  params: Promise<{ storeId: string; itemId: string; enhancementId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, itemId, enhancementId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  try {
    const result = await applyMenuImageEnhancement(owner.storeCtx, owner.db, itemId, enhancementId);
    return Response.json({ imageUrl: publicMediaPath(result.imageKey) });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : null;
    if (code) return Response.json({ error: code }, { status: 422 });
    throw error;
  }
}
