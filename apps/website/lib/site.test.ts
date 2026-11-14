import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAppProSignupUrl, PRO_UPGRADE_PATH } from './site';

describe('getAppProSignupUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('登录后带着 next 回到升级入口', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.menu.dyqr.me/');
    const url = new URL(getAppProSignupUrl());
    expect(url.origin + url.pathname).toBe('https://app.menu.dyqr.me/login');
    expect(url.searchParams.get('next')).toBe(PRO_UPGRADE_PATH);
  });
});
