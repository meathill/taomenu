import { type Db, resolveStoreContext, type StoreContext } from '@taomenu/db';
import { notFound, unauthorized } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/session';

export type OwnerRequestContext = {
  userId: string;
  db: Db;
  storeCtx: StoreContext;
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

export function isErrorResponse(value: OwnerRequestContext | Response): value is Response {
  return value instanceof Response;
}
