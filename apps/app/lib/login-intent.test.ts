import { describe, expect, it, vi } from 'vitest';
import { isSignupIntent } from './login-intent';
import { getHelpUrl } from './public-url';

describe('登录页注册意图（issue #24）', () => {
  it('只认 intent=signup', () => {
    expect(isSignupIntent('signup')).toBe(true);
    expect(isSignupIntent(['signup', 'x'])).toBe(true);
    expect(isSignupIntent('login')).toBe(false);
    expect(isSignupIntent(undefined)).toBe(false);
  });

  it('帮助链接指向营销站对应语言的联系页', () => {
    vi.stubEnv('NEXT_PUBLIC_WEBSITE_URL', 'https://menu.dyqr.me/');
    expect(getHelpUrl('en')).toBe('https://menu.dyqr.me/contact-us');
    expect(getHelpUrl('vi')).toBe('https://menu.dyqr.me/vi/contact-us');
    vi.unstubAllEnvs();
  });
});
