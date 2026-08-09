import { MenuImportError, reviewMenuImport } from '@taomenu/db';
import { reviewMenuImportSchema } from '@taomenu/shared';
import { badRequest } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; importId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { storeId, importId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  const parsed = reviewMenuImportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('INVALID_REVIEW');
  try {
    await reviewMenuImport(owner.storeCtx, owner.db, importId, parsed.data);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof MenuImportError) {
      return Response.json({ error: error.code }, { status: 409 });
    }
    throw error;
  }
}
