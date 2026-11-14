import { describe, expect, it } from 'vitest';
import { createStoreSchema, updateStoreSchema } from './store';
import {
  COMMON_TIME_ZONES,
  DEFAULT_STORE_TIMEZONE,
  formatGmtOffset,
  formatTimeZoneLabel,
  guessTimeZoneFromCurrency,
  isValidTimeZone,
  listTimeZones,
  resolveDefaultTimeZone,
  timeZoneFallbackName,
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

  it('VND 默认越南时区，即使浏览器在东京', () => {
    expect(resolveDefaultTimeZone('Asia/Tokyo', { currency: 'VND' })).toBe('Asia/Ho_Chi_Minh');
    expect(guessTimeZoneFromCurrency('VND')).toBe('Asia/Ho_Chi_Minh');
    expect(guessTimeZoneFromCurrency('USD')).toBeNull();
    expect(guessTimeZoneFromCurrency('EUR')).toBeNull();
  });

  it('无币种时按界面语言兜底', () => {
    expect(resolveDefaultTimeZone(undefined, { locale: 'vi' })).toBe('Asia/Ho_Chi_Minh');
    expect(resolveDefaultTimeZone(undefined, { locale: 'ja' })).toBe('Asia/Tokyo');
    expect(resolveDefaultTimeZone(undefined, { locale: 'zh-CN' })).toBe('Asia/Shanghai');
  });

  it('JPY 等单一国家币种也能对应时区；浏览器时区在无币种时仍优先', () => {
    expect(resolveDefaultTimeZone('Asia/Tokyo', { currency: 'JPY' })).toBe('Asia/Tokyo');
    expect(resolveDefaultTimeZone('Europe/Paris', { currency: 'USD' })).toBe('Europe/Paris');
    expect(guessTimeZoneFromCurrency('JPY')).toBe('Asia/Tokyo');
  });

  it('候选列表常见时区在前，并包含当前值', () => {
    const zones = listTimeZones('Europe/Paris');
    expect(zones.slice(0, COMMON_TIME_ZONES.length)).toEqual([...COMMON_TIME_ZONES]);
    expect(zones).toContain('Europe/Paris');
    expect(zones).toContain(DEFAULT_STORE_TIMEZONE);
    expect(zones.indexOf('Asia/Ho_Chi_Minh')).toBe(0);
    const firstUncommon = zones.find(
      (zone) => !(COMMON_TIME_ZONES as readonly string[]).includes(zone),
    );
    expect(firstUncommon).toBeTruthy();
    expect(zones.indexOf('Asia/Tokyo')).toBeGreaterThan(-1);
    expect(zones.indexOf('Asia/Tokyo')).toBeLessThan(zones.indexOf(firstUncommon!));
  });

  it('时区标签用友好名 + GMT 偏移，而不是原始 IANA', () => {
    const winter = new Date('2026-01-15T12:00:00Z');
    const summer = new Date('2026-07-15T12:00:00Z');
    expect(formatGmtOffset('Asia/Ho_Chi_Minh', winter)).toBe('GMT+7');
    expect(formatGmtOffset('Asia/Kolkata', winter)).toBe('GMT+5:30');
    expect(formatGmtOffset('Europe/Paris', winter)).toBe('GMT+1');
    expect(formatGmtOffset('Europe/Paris', summer)).toBe('GMT+2');
    expect(formatTimeZoneLabel('Asia/Ho_Chi_Minh', 'Việt Nam', winter)).toBe('Việt Nam (GMT+7)');
    expect(timeZoneFallbackName('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
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
