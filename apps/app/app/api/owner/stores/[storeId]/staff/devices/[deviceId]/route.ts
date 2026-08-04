import { revokeTerminalDevice } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; deviceId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { storeId, deviceId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const revoked = await revokeTerminalDevice(owner.storeCtx, owner.db, deviceId);
  if (!revoked) return notFound();
  return Response.json({ ok: true });
}
