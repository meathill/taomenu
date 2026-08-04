import { type Db, resolveStoreContext, type StoreContext } from '@taomenu/db';
import { notFound, unauthorized } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/session';
import { getTerminalSession } from '@/lib/terminal-session';

export type OwnerRequestContext = {
  userId: string;
  db: Db;
  storeCtx: StoreContext;
};

export type StoreActorContext = OwnerRequestContext & {
  actor: {
    type: 'owner' | 'terminal';
    terminalId: string | null;
  };
};

/** 解析 owner API 的用户 + 门店上下文；失败时返回 Response。 */
export async function requireOwnerStore(storeId: string): Promise<OwnerRequestContext | Response> {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }
  const db = getDb();
  const storeCtx = await resolveStoreContext(db, userId, storeId);
  if (!storeCtx) {
    return notFound();
  }
  return { userId, db, storeCtx };
}

/** 操作订单的 API 同时接受店主会话和已配对终端凭证。 */
export async function requireStoreActor(storeId: string): Promise<StoreActorContext | Response> {
  const userId = await requireUserId();
  const db = getDb();
  if (userId) {
    const storeCtx = await resolveStoreContext(db, userId, storeId);
    if (!storeCtx) return notFound();
    return { userId, db, storeCtx, actor: { type: 'owner', terminalId: null } };
  }

  const terminal = await getTerminalSession();
  if (!terminal || terminal.storeCtx.storeId !== storeId) {
    return unauthorized();
  }
  return {
    userId: terminal.storeCtx.userId,
    db,
    storeCtx: terminal.storeCtx,
    actor: { type: 'terminal', terminalId: terminal.device.id },
  };
}

export function isErrorResponse(value: OwnerRequestContext | Response): value is Response {
  return value instanceof Response;
}
