import { describe, expect, it } from 'vitest';
import { seedStore, seedUser } from '../testing/agent-fixtures';
import { createTestDb } from '../testing/memory-d1';
import type { StoreContext } from '../types';
import {
  getShowPoweredBy,
  getStoreBranding,
  StoreBrandingError,
  setStoreCoverImage,
  updateStoreBranding,
} from './store-branding';

function ctxFor(storeId: string, plan: 'free' | 'pro'): StoreContext {
  return { storeId, userId: 'owner-1', role: 'owner', plan, staffSeatAddons: 0 };
}

describe('店铺品牌设置（issue #26）', () => {
  it('Pro 打开开关后公开菜单隐藏 Powered by，关掉后恢复', async () => {
    const db = createTestDb();
    await seedUser(db, 'owner-1', 'owner@example.com');
    await seedStore(db, 'store-pro', { plan: 'pro' });
    const ctx = ctxFor('store-pro', 'pro');

    expect(await getShowPoweredBy(db, 'store-pro', 'pro')).toBe(true);
    await updateStoreBranding(ctx, db, { hidePoweredBy: true });
    expect(await getStoreBranding(db, 'store-pro')).toEqual({
      hidePoweredBy: true,
      coverImageKey: null,
    });
    expect(await getShowPoweredBy(db, 'store-pro', 'pro')).toBe(false);
    await updateStoreBranding(ctx, db, { hidePoweredBy: false });
    expect(await getShowPoweredBy(db, 'store-pro', 'pro')).toBe(true);
  });

  it('Free 不能打开开关，服务端直接拒绝', async () => {
    const db = createTestDb();
    await seedUser(db, 'owner-1', 'owner@example.com');
    await seedStore(db, 'store-free', { plan: 'free' });

    await expect(
      updateStoreBranding(ctxFor('store-free', 'free'), db, { hidePoweredBy: true }),
    ).rejects.toBeInstanceOf(StoreBrandingError);
    expect(await getStoreBranding(db, 'store-free')).toEqual({
      hidePoweredBy: false,
      coverImageKey: null,
    });
  });

  it('降级回 Free 后，残留的开关不再生效', async () => {
    const db = createTestDb();
    await seedUser(db, 'owner-1', 'owner@example.com');
    await seedStore(db, 'store-x', { plan: 'pro' });
    await updateStoreBranding(ctxFor('store-x', 'pro'), db, { hidePoweredBy: true });

    expect(await getShowPoweredBy(db, 'store-x', 'free')).toBe(true);
  });

  it('migration 0016 未执行（表不存在）时按默认值显示，不报错', async () => {
    const db = createTestDb('0001_init.sql');

    expect(await getStoreBranding(db, 'store-any')).toEqual({
      hidePoweredBy: false,
      coverImageKey: null,
    });
    expect(await getShowPoweredBy(db, 'store-any', 'pro')).toBe(true);
    await expect(
      updateStoreBranding(ctxFor('store-any', 'pro'), db, { hidePoweredBy: true }),
    ).rejects.toMatchObject({ code: 'NOT_MIGRATED' });
  });

  it('设置封面后开关 Powered by 不会清掉封面', async () => {
    const db = createTestDb();
    await seedUser(db, 'owner-1', 'owner@example.com');
    await seedStore(db, 'store-pro', { plan: 'pro' });
    const ctx = ctxFor('store-pro', 'pro');

    const key =
      'store-covers/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg';
    await setStoreCoverImage(ctx, db, key);
    expect(await getStoreBranding(db, 'store-pro')).toEqual({
      hidePoweredBy: false,
      coverImageKey: key,
    });
    await updateStoreBranding(ctx, db, { hidePoweredBy: true });
    expect(await getStoreBranding(db, 'store-pro')).toEqual({
      hidePoweredBy: true,
      coverImageKey: key,
    });
    await setStoreCoverImage(ctx, db, null);
    expect(await getStoreBranding(db, 'store-pro')).toEqual({
      hidePoweredBy: true,
      coverImageKey: null,
    });
  });
});
