import { getTerminalByCredential, resolveStoreContext, touchTerminalDevice } from '@taomenu/db';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export const TERMINAL_CREDENTIAL_COOKIE = 'taomenu_terminal_credential';

export async function getTerminalSession(userId: string) {
  const credential = (await cookies()).get(TERMINAL_CREDENTIAL_COOKIE)?.value;
  if (!credential) return null;

  const db = getDb();
  const device = await getTerminalByCredential(db, credential);
  if (!device || device.staffUserId !== userId) return null;
  const staffCtx = await resolveStoreContext(db, userId, device.storeId);
  if (staffCtx?.role !== 'staff') return null;
  const storeCtx = await resolveStoreContext(db, device.pairedByUserId, device.storeId);
  if (!storeCtx) return null;

  await touchTerminalDevice(db, device.id);
  return { device, storeCtx, credential };
}
