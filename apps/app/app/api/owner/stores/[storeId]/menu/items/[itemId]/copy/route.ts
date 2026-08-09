import { duplicateItem } from '@taomenu/db';
import { isLocale } from '@taomenu/shared';
import { notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; itemId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { storeId, itemId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

  const body = (await request.json().catch(() => null)) as { locale?: string } | null;
  const result = await duplicateItem(
    owner.storeCtx,
    owner.db,
    itemId,
    isLocale(body?.locale) ? body.locale : undefined,
  );
  if (!result) {
    return notFound();
  }
  return Response.json(result, { status: 201 });
}
