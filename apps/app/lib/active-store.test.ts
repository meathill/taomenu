import { describe, expect, it } from 'vitest';
import {
  destinationAfterCreateStore,
  readStoreSlug,
  resolveActiveStore,
  withStore,
} from './active-store-utils';

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

describe('destinationAfterCreateStore', () => {
  it('lands on the newly created store overview, not the fallback first store', () => {
    expect(destinationAfterCreateStore('qa-pho-chi-mai-hoi-an', '/app')).toBe(
      '/app?store=qa-pho-chi-mai-hoi-an',
    );
  });

  it('falls back when the create response has no slug', () => {
    expect(destinationAfterCreateStore(undefined, '/app')).toBe('/app');
  });
});
