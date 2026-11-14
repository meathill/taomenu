export type StoreSearchParams = {
  store?: string | string[];
  billing?: string | string[];
  menuLocale?: string | string[];
  /** 定价页 Pro 入口带来的升级意图（issue #16） */
  upgrade?: string | string[];
  next?: string | string[];
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

/** 刚建好的店必须写进 URL，否则会回落到店主名下第一家店（往往是旧店）。 */
export function destinationAfterCreateStore(
  storeSlug: string | undefined,
  fallback: string,
): string {
  return storeSlug ? withStore('/app', storeSlug) : fallback;
}
