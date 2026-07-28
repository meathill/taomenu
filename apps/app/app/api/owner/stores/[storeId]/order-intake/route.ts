import { updateStore } from '@taomenu/db';
import { z } from 'zod';
import { badRequest } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

const bodySchema = z.object({
  acceptingPublicRequests: z.boolean(),
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

  const store = await updateStore(owner.storeCtx, owner.db, {
    acceptingPublicRequests: parsed.data.acceptingPublicRequests,
  });
  return Response.json({ store });
}
