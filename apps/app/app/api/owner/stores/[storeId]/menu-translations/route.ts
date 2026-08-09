import {
  createMenuTranslation,
  failMenuTranslation,
  getLatestMenuTranslation,
  getMenuTranslationUsage,
} from '@taomenu/db';
import { getPlanLimits } from '@taomenu/shared';
import { z } from 'zod';
import { badRequest } from '@/lib/api-error';
import { getEnv } from '@/lib/cf';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

const createSchema = z.object({
  targetLocale: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
});

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  if (!getPlanLimits(owner.storeCtx.plan).canUseAiTranslation) {
    return Response.json({ error: 'PRO_REQUIRED' }, { status: 403 });
  }
  const [view, usage] = await Promise.all([
    getLatestMenuTranslation(owner.storeCtx, owner.db),
    getMenuTranslationUsage(owner.storeCtx, owner.db),
  ]);
  return Response.json({ view, usage });
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  if (!getPlanLimits(owner.storeCtx.plan).canUseAiTranslation) {
    return Response.json({ error: 'PRO_REQUIRED' }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest('INVALID_TARGET_LOCALE');

  try {
    const result = await createMenuTranslation(owner.storeCtx, owner.db, parsed.data.targetLocale);
    try {
      await getEnv().AI_MENU_QUEUE.send({
        type: 'menu_translation',
        translationId: result.jobId,
      });
    } catch {
      await failMenuTranslation(owner.db, result.jobId, 'QUEUE_UNAVAILABLE');
      return Response.json({ error: 'QUEUE_UNAVAILABLE' }, { status: 503 });
    }
    return Response.json(result, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : null;
    if (code) return Response.json({ error: code }, { status: 422 });
    throw error;
  }
}
