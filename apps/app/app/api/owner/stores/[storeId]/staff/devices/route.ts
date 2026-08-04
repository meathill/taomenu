import { listTerminalDevices } from '@taomenu/db';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const devices = await listTerminalDevices(owner.storeCtx, owner.db);
  return Response.json({ devices });
}
