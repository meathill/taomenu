import { describe, expect, it } from 'vitest';
import { createStoreSchema, updateStoreSchema } from './store';
import {
  DEFAULT_STORE_TIMEZONE,
  isValidTimeZone,
  listTimeZones,
  resolveDefaultTimeZone,
} from './timezone';

describe('店铺时区（issue #19）', () => {
  it('识别合法 IANA 时区，拒绝随意文本', () => {
    expect(isValidTimeZone('Europe/Paris')).toBe(true);
    expect(isValidTimeZone('Asia/Shanghai')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  it('默认取浏览器时区，无效时回退越南', () => {
    expect(resolveDefaultTimeZone('Europe/Paris')).toBe('Europe/Paris');
    expect(resolveDefaultTimeZone('not a zone')).toBe(DEFAULT_STORE_TIMEZONE);
    expect(resolveDefaultTimeZone(undefined)).toBe(DEFAULT_STORE_TIMEZONE);
  });

  it('候选列表包含当前值', () => {
    const zones = listTimeZones('Europe/Paris');
    expect(zones).toContain('Europe/Paris');
    expect(zones).toContain(DEFAULT_STORE_TIMEZONE);
  });

  it('创建/更新店铺时后端拒绝非法时区', () => {
    expect(
      createStoreSchema.safeParse({ name: 'A', serviceMode: 'hybrid', timezone: 'Europe/Paris' })
        .success,
    ).toBe(true);
    expect(
      createStoreSchema.safeParse({ name: 'A', serviceMode: 'hybrid', timezone: 'Paris' }).success,
    ).toBe(false);
    expect(updateStoreSchema.safeParse({ timezone: 'whatever' }).success).toBe(false);
  });
});
