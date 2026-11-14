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
