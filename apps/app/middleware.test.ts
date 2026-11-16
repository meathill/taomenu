import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import middleware from './middleware';

function request(path: string, init: { acceptLanguage?: string; cookie?: string } = {}) {
  const headers = new Headers();
  if (init.acceptLanguage) headers.set('accept-language', init.acceptLanguage);
  if (init.cookie) headers.set('cookie', init.cookie);
  return new NextRequest(`https://app.example.com${path}`, { headers });
}

function localeCookie(response: Response): string | undefined {
  return response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith('NEXT_LOCALE='))
    ?.split(';')[0]
    ?.slice('NEXT_LOCALE='.length);
}

describe('语言前缀优先（issue #27）', () => {
  it('首次访问 /zh/login：即使 Accept-Language 是日语，也写入 zh', () => {
    const response = middleware(request('/zh/login', { acceptLanguage: 'ja' }));
    expect(localeCookie(response)).toBe('zh');
  });

  it('已有 ja cookie 时访问 /en/login，以前缀 en 为准', () => {
    const response = middleware(request('/en/login', { cookie: 'NEXT_LOCALE=ja' }));
    expect(localeCookie(response)).toBe('en');
  });

  it('无前缀时仍按 Accept-Language 协商，且不覆盖已有 cookie', () => {
    expect(localeCookie(middleware(request('/login', { acceptLanguage: 'vi' })))).toBe('vi');
    const withCookie = middleware(
      request('/login', { acceptLanguage: 'vi', cookie: 'NEXT_LOCALE=zh' }),
    );
    expect(localeCookie(withCookie)).toBeUndefined();
  });
});

function locationPath(response: Response): string {
  const location = response.headers.get('location');
  if (!location) {
    return '';
  }
  return (
    new URL(location, 'https://app.example.com').pathname +
    new URL(location, 'https://app.example.com').search
  );
}

describe('带前缀的请求当场改用前缀语言', () => {
  it('GET /vi/app/menu 且已有 NEXT_LOCALE=en 时，未登录跳转登录并把语言写成 vi', () => {
    const response = middleware(
      request('/vi/app/menu?store=qa-pho-chi-mai-hoi-an', { cookie: 'NEXT_LOCALE=en' }),
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(localeCookie(response)).toBe('vi');
    expect(locationPath(response)).toBe(
      '/login?next=%2Fapp%2Fmenu%3Fstore%3Dqa-pho-chi-mai-hoi-an',
    );
    expect(response.headers.get('cache-control')).toMatch(/no-store/);
    expect(response.headers.get('vary')).toMatch(/Cookie/i);
  });

  it('GET /zh/app/menu、/ja/app/menu 同样在本次跳转写入对应语言', () => {
    const zh = middleware(request('/zh/app/menu', { cookie: 'NEXT_LOCALE=en' }));
    expect(localeCookie(zh)).toBe('zh');
    expect(locationPath(zh).startsWith('/login?next=')).toBe(true);
    expect(locationPath(zh)).not.toContain('/zh/');

    const ja = middleware(request('/ja/app/menu', { cookie: 'NEXT_LOCALE=en' }));
    expect(localeCookie(ja)).toBe('ja');
    expect(locationPath(ja)).toContain('/login?next=');
  });

  it('公开的 /vi/m/… 带 en cookie 时，307 到去前缀路径并写入 vi', () => {
    const response = middleware(
      request('/vi/m/qa-pho-chi-mai-hoi-an/p/token?x=1', { cookie: 'NEXT_LOCALE=en' }),
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(localeCookie(response)).toBe('vi');
    expect(locationPath(response)).toBe('/m/qa-pho-chi-mai-hoi-an/p/token?x=1');
    expect(response.headers.get('cache-control')).toMatch(/no-store/);
    expect(response.headers.get('vary')).toMatch(/Cookie/i);
  });

  it('GET /vi/login 且已有 en cookie 时，307 到 /login 并写入 vi', () => {
    const response = middleware(request('/vi/login', { cookie: 'NEXT_LOCALE=en' }));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(localeCookie(response)).toBe('vi');
    expect(locationPath(response)).toBe('/login');
    expect(response.headers.get('cache-control')).toMatch(/no-store/);
  });

  it('无前缀的 /m/… 与 /login 不覆盖已有 cookie', () => {
    const menu = middleware(request('/m/qa-shop/p/token', { cookie: 'NEXT_LOCALE=zh' }));
    expect(localeCookie(menu)).toBeUndefined();

    const login = middleware(request('/login', { cookie: 'NEXT_LOCALE=zh', acceptLanguage: 'vi' }));
    expect(localeCookie(login)).toBeUndefined();
  });
});
