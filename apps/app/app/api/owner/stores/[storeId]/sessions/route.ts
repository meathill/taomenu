import { getSessionBalance, listOpenSessions } from '@taomenu/db';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const sessions = await listOpenSessions(owner.storeCtx, owner.db);
  const withBalance = await Promise.all(
    sessions.map(async (s) => {
      const balance = await getSessionBalance(owner.storeCtx, owner.db, s.id);
      return { ...s, balance };
    }),
  );
  return Response.json({ sessions: withBalance });
}
