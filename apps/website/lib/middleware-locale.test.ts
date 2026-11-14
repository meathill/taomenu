import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import middleware from '../middleware';

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://www.example.com${path}`, { headers: new Headers(headers) });
}

describe('官网语言前缀优先（issue #27）', () => {
  it('/zh/pricing 不受 Accept-Language 与 cookie 影响，直接按 zh 渲染', () => {
    const response = middleware(
      request('/zh/pricing', { 'accept-language': 'ja', cookie: 'NEXT_LOCALE=vi' }),
    );
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-request-x-next-intl-locale')).toBe('zh');
  });

  it('裸路径固定为 en，不做协商重定向', () => {
    const response = middleware(request('/pricing', { 'accept-language': 'ja' }));
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-request-x-next-intl-locale')).toBe('en');
  });
});
