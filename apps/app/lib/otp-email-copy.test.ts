import { describe, expect, it } from 'vitest';
import { getOtpEmailCopy, resolveEmailLocale } from './otp-email-copy';

describe('otp-email-copy', () => {
  it('resolveEmailLocale 优先 cookie NEXT_LOCALE', () => {
    expect(
      resolveEmailLocale({
        cookieHeader: 'a=1; NEXT_LOCALE=zh; b=2',
        acceptLanguage: 'en-US,en;q=0.9',
      }),
    ).toBe('zh');
  });

  it('无 cookie 时用 Accept-Language', () => {
    expect(resolveEmailLocale({ acceptLanguage: 'ja-JP,ja;q=0.9' })).toBe('ja');
  });

  it('默认 en', () => {
    expect(resolveEmailLocale({})).toBe('en');
    expect(getOtpEmailCopy('en', 'sign-in').subject).toMatch(/sign-in/i);
  });

  it('各语言 sign-in 文案非空且互不相同', () => {
    const en = getOtpEmailCopy('en', 'sign-in').subject;
    const zh = getOtpEmailCopy('zh', 'sign-in').subject;
    const vi = getOtpEmailCopy('vi', 'sign-in').subject;
    expect(en).not.toBe(zh);
    expect(en).not.toBe(vi);
    expect(zh).toContain('登录');
  });
});
