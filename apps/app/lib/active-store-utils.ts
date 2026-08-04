export type StoreSearchParams = {
  store?: string | string[];
};

export function resolveActiveStore<T extends { slug: string }>(
  stores: readonly T[],
  requestedSlug?: string | null,
): T | null {
  if (stores.length === 0) return null;
  return stores.find((store) => store.slug === requestedSlug) ?? stores[0] ?? null;
}

export function readStoreSlug(params: StoreSearchParams | undefined): string | undefined {
  const value = params?.store;
  if (Array.isArray(value)) return value[0];
  return value;
}

export function withStore(path: string, storeSlug: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}store=${encodeURIComponent(storeSlug)}`;
}
