import { applyMenuTranslation } from '@taomenu/db';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; jobId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId, jobId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  try {
    return Response.json(await applyMenuTranslation(owner.storeCtx, owner.db, jobId));
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : null;
    if (code) return Response.json({ error: code }, { status: 409 });
    throw error;
  }
}
