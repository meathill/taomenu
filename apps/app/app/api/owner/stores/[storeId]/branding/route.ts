import {
  getStoreBranding,
  resolveStoreContext,
  StoreBrandingError,
  updateStoreBranding,
} from '@taomenu/db';
import { z } from 'zod';
import { badRequest, notFound, unauthorized } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/session';

type RouteContext = {
  params: Promise<{ storeId: string }>;
};

const updateBrandingSchema = z.object({ hidePoweredBy: z.boolean() });

export async function GET(_request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }
  const { storeId } = await context.params;
  const db = getDb();
  const storeCtx = await resolveStoreContext(db, userId, storeId);
  if (storeCtx?.role !== 'owner') {
    return notFound();
  }
  return Response.json({ branding: await getStoreBranding(db, storeCtx.storeId) });
}

/** issue #26：隐藏「Powered by TaoMenu」只对 Pro 开放，服务端强制校验套餐 */
export async function PUT(request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }
  const { storeId } = await context.params;
  const db = getDb();
  const storeCtx = await resolveStoreContext(db, userId, storeId);
  if (storeCtx?.role !== 'owner') {
    return notFound();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = updateBrandingSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  try {
    const branding = await updateStoreBranding(storeCtx, db, parsed.data);
    return Response.json({ branding });
  } catch (error) {
    if (error instanceof StoreBrandingError) {
      const status = error.code === 'PRO_REQUIRED' ? 403 : 503;
      return Response.json({ error: error.code }, { status });
    }
    throw error;
  }
}
