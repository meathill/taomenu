import { createTerminalPairingCode } from '@taomenu/db';
import { badRequest } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const result = await createTerminalPairingCode(owner.storeCtx, owner.db);
  if ('error' in result) {
    return badRequest('Staff device limit reached for this plan.');
  }
  return Response.json(result, { status: 201 });
}
