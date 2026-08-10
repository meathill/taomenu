import { describe, expect, it } from 'vitest';
import { extractRequestHeaders, readCookieValue } from './request-headers';

describe('extractRequestHeaders', () => {
  it('从 ctx.request 取头', () => {
    const request = new Request('https://app.example.com/', { headers: { cookie: 'tm_ref=ABCD' } });
    expect(extractRequestHeaders({ request })?.get('cookie')).toBe('tm_ref=ABCD');
  });

  it('从 ctx.headers 取头', () => {
    const headers = new Headers({ cookie: 'tm_ref=ABCD' });
    expect(extractRequestHeaders({ headers })?.get('cookie')).toBe('tm_ref=ABCD');
  });

  it('形状不符时返回 null 而不抛错', () => {
    expect(extractRequestHeaders(null)).toBeNull();
    expect(extractRequestHeaders(undefined)).toBeNull();
    expect(extractRequestHeaders('ctx')).toBeNull();
    expect(extractRequestHeaders({})).toBeNull();
    expect(extractRequestHeaders({ request: {}, headers: {} })).toBeNull();
  });
});

describe('readCookieValue', () => {
  it('读取指定 cookie', () => {
    expect(readCookieValue('tm_ref=AB3K9XYZ', 'tm_ref')).toBe('AB3K9XYZ');
    expect(readCookieValue('NEXT_LOCALE=zh; tm_ref=AB3K9XYZ; other=1', 'tm_ref')).toBe('AB3K9XYZ');
  });

  it('不存在、空头、空值都返回 null', () => {
    expect(readCookieValue(null, 'tm_ref')).toBeNull();
    expect(readCookieValue(undefined, 'tm_ref')).toBeNull();
    expect(readCookieValue('', 'tm_ref')).toBeNull();
    expect(readCookieValue('NEXT_LOCALE=zh', 'tm_ref')).toBeNull();
    expect(readCookieValue('tm_ref=', 'tm_ref')).toBeNull();
    expect(readCookieValue('tm_ref', 'tm_ref')).toBeNull();
  });

  it('不会被同前缀的 cookie 名误命中', () => {
    expect(readCookieValue('tm_referrer=NOPE; tm_ref=YES1', 'tm_ref')).toBe('YES1');
  });

  it('保留值里的等号', () => {
    expect(readCookieValue('token=a=b=c', 'token')).toBe('a=b=c');
  });
});
