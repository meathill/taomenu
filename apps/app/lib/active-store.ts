import { listStoresForUser, type StoreRow } from '@taomenu/db';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { readStoreSlug, resolveActiveStore, withStore } from './active-store-utils';

export type { StoreSearchParams } from './active-store-utils';
export { readStoreSlug, resolveActiveStore, withStore };

export type OwnerStoreSelection = {
  stores: StoreRow[];
  store: StoreRow | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

export async function getOwnerStoreSelection(
  requestedSlug?: string | null,
): Promise<OwnerStoreSelection | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const stores = await listStoresForUser(getDb(), session.user.id);
  return {
    stores,
    store: resolveActiveStore(stores, requestedSlug),
    user: {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email,
    },
  };
}
