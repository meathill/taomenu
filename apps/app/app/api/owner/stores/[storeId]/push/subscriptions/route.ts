import { upsertPushSubscription } from '@taomenu/db';
import { z } from 'zod';
import { badRequest } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  platform: z.string().max(32).optional(),
});

type RouteContext = { params: Promise<{ storeId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const result = await upsertPushSubscription(owner.storeCtx, owner.db, {
    subjectType: 'owner',
    userId: owner.userId,
    endpoint: parsed.data.endpoint,
    p256dhKey: parsed.data.keys.p256dh,
    authKey: parsed.data.keys.auth,
    platform: parsed.data.platform ?? null,
    userAgent: request.headers.get('user-agent'),
  });

  return Response.json({ subscriptionId: result.id, reused: result.reused }, { status: 201 });
}
