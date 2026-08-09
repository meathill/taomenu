import { reviewMenuTranslation } from '@taomenu/db';
import { reviewMenuTranslationSchema } from '@taomenu/shared';
import { badRequest } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; jobId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, jobId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  const parsed = reviewMenuTranslationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('INVALID_TRANSLATION_REVIEW');
  try {
    return Response.json(await reviewMenuTranslation(owner.storeCtx, owner.db, jobId, parsed.data));
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : null;
    if (code) return Response.json({ error: code }, { status: 409 });
    throw error;
  }
}
