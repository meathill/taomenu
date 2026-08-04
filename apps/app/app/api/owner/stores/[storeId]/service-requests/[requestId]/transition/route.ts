import { transitionServiceRequest } from '@taomenu/db';
import { z } from 'zod';
import { badRequest, notFound } from '@/lib/api-error';
import { isErrorResponse, requireStoreActor } from '@/lib/owner-context';

const bodySchema = z.object({
  status: z.enum(['acknowledged', 'resolved', 'cancelled']),
});

type RouteContext = { params: Promise<{ storeId: string; requestId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { storeId, requestId } = await context.params;
  const owner = await requireStoreActor(storeId);
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

  const result = await transitionServiceRequest(
    owner.storeCtx,
    owner.db,
    requestId,
    parsed.data.status,
  );
  if (!result) return notFound();
  if ('error' in result) return badRequest(String(result.error));
  return Response.json(result);
}
