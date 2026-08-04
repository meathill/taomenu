import { describe, expect, it } from 'vitest';
import { readStoreSlug, resolveActiveStore, withStore } from './active-store-utils';

const stores = [{ slug: 'first' }, { slug: 'second' }];

describe('active store', () => {
  it('uses the requested accessible store', () => {
    expect(resolveActiveStore(stores, 'second')?.slug).toBe('second');
  });

  it('falls back to the first accessible store for an invalid slug', () => {
    expect(resolveActiveStore(stores, 'missing')?.slug).toBe('first');
    expect(resolveActiveStore(stores)?.slug).toBe('first');
  });

  it('preserves store query parameters on navigation', () => {
    expect(withStore('/app/menu', 'coffee-shop')).toBe('/app/menu?store=coffee-shop');
    expect(withStore('/app/menu?tab=items', 'coffee-shop')).toBe(
      '/app/menu?tab=items&store=coffee-shop',
    );
  });

  it('reads the first value from Next search params', () => {
    expect(readStoreSlug({ store: ['second', 'first'] })).toBe('second');
    expect(readStoreSlug({ store: 'first' })).toBe('first');
  });
});
