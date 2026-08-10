import { describe, expect, it } from 'vitest';
import {
  appendRefToAppLink,
  buildRefCookie,
  normalizeRefCode,
  REF_COOKIE_MAX_AGE_SECONDS,
  readRefCookie,
} from './ref';

describe('normalizeRefCode', () => {
  it('归一化为大写并去掉首尾空白', () => {
    expect(normalizeRefCode(' ab3k9xyz ')).toBe('AB3K9XYZ');
    expect(normalizeRefCode('AB3K9XYZ')).toBe('AB3K9XYZ');
  });

  it('接受 4~16 位字母数字', () => {
    expect(normalizeRefCode('AB3K')).toBe('AB3K');
    expect(normalizeRefCode('A1B2C3D4E5F6G7H8')).toBe('A1B2C3D4E5F6G7H8');
  });

  it('拒绝空值、长度越界与非法字符', () => {
    expect(normalizeRefCode(null)).toBeNull();
    expect(normalizeRefCode(undefined)).toBeNull();
    expect(normalizeRefCode('')).toBeNull();
    expect(normalizeRefCode('AB3')).toBeNull();
    expect(normalizeRefCode('A1B2C3D4E5F6G7H8I')).toBeNull();
    expect(normalizeRefCode('AB3K-9XY')).toBeNull();
    expect(normalizeRefCode('AB3K 9XY')).toBeNull();
    expect(normalizeRefCode('<script>')).toBeNull();
  });
});

describe('readRefCookie', () => {
  it('从多值 cookie 串里取出并归一化推广码', () => {
    expect(readRefCookie('NEXT_LOCALE=zh; tm_ref=ab3k9xyz; other=1')).toBe('AB3K9XYZ');
    expect(readRefCookie('tm_ref=AB3K9XYZ')).toBe('AB3K9XYZ');
  });

  it('没有该 cookie 时返回 null', () => {
    expect(readRefCookie('')).toBeNull();
    expect(readRefCookie('NEXT_LOCALE=zh')).toBeNull();
    expect(readRefCookie('tm_ref_other=AB3K9XYZ')).toBeNull();
  });

  it('值不合法时视为不存在（可被新的首触覆盖）', () => {
    expect(readRefCookie('tm_ref=')).toBeNull();
    expect(readRefCookie('tm_ref=<script>')).toBeNull();
  });
});

describe('buildRefCookie', () => {
  it('30 天有效期、根路径、SameSite=Lax', () => {
    expect(buildRefCookie('AB3K9XYZ', { secure: false })).toBe(
      `tm_ref=AB3K9XYZ; Max-Age=${REF_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`,
    );
    expect(REF_COOKIE_MAX_AGE_SECONDS).toBe(2592000);
  });

  it('https 下追加 Secure', () => {
    expect(buildRefCookie('AB3K9XYZ', { secure: true })).toContain('; Secure');
  });
});

describe('appendRefToAppLink', () => {
  const appUrl = 'https://app.menu.dyqr.me';

  it('给同源 app 链接补上 ref', () => {
    expect(appendRefToAppLink('https://app.menu.dyqr.me/login', appUrl, 'AB3K9XYZ')).toBe(
      'https://app.menu.dyqr.me/login?ref=AB3K9XYZ',
    );
  });

  it('保留原有 query 与 hash', () => {
    expect(
      appendRefToAppLink('https://app.menu.dyqr.me/login?next=%2Fapp#top', appUrl, 'AB3K9XYZ'),
    ).toBe('https://app.menu.dyqr.me/login?next=%2Fapp&ref=AB3K9XYZ#top');
  });

  it('已带 ref 时不覆盖', () => {
    expect(
      appendRefToAppLink('https://app.menu.dyqr.me/login?ref=OTHER123', appUrl, 'AB3K9XYZ'),
    ).toBeNull();
  });

  it('非 app 链接一律不改写', () => {
    expect(appendRefToAppLink('https://menu.dyqr.me/pricing', appUrl, 'AB3K9XYZ')).toBeNull();
    expect(appendRefToAppLink('https://evil.example.com/login', appUrl, 'AB3K9XYZ')).toBeNull();
    expect(appendRefToAppLink('mailto:hi@example.com', appUrl, 'AB3K9XYZ')).toBeNull();
    expect(appendRefToAppLink('#section', appUrl, 'AB3K9XYZ')).toBeNull();
    expect(appendRefToAppLink('', appUrl, 'AB3K9XYZ')).toBeNull();
  });

  it('区分同名前缀的不同端口（本地 3001 vs 30011）', () => {
    expect(
      appendRefToAppLink('http://localhost:30011/login', 'http://localhost:3001', 'AB3K'),
    ).toBeNull();
    expect(appendRefToAppLink('http://localhost:3001/login', 'http://localhost:3001', 'AB3K')).toBe(
      'http://localhost:3001/login?ref=AB3K',
    );
  });

  it('app URL 带子路径时只改写该子路径下的链接', () => {
    const scoped = 'https://menu.dyqr.me/app';
    expect(appendRefToAppLink('https://menu.dyqr.me/app/login', scoped, 'AB3K')).toBe(
      'https://menu.dyqr.me/app/login?ref=AB3K',
    );
    expect(appendRefToAppLink('https://menu.dyqr.me/pricing', scoped, 'AB3K')).toBeNull();
  });
});
