import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAppProPlusSignupUrl,
  getAppProSignupUrl,
  getAppSignupUrl,
  PRO_PLUS_UPGRADE_PATH,
  PRO_UPGRADE_PATH,
} from './site';

describe('getAppProSignupUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('登录后带着 next 回到升级入口', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.menu.dyqr.me/');
    const url = new URL(getAppProSignupUrl());
    expect(url.origin + url.pathname).toBe('https://app.menu.dyqr.me/login');
    expect(url.searchParams.get('next')).toBe(PRO_UPGRADE_PATH);
    expect(url.searchParams.get('intent')).toBe('signup');
  });

  it('「免费开始」带 intent=signup（issue #24）', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.menu.dyqr.me');
    expect(getAppSignupUrl()).toBe('https://app.menu.dyqr.me/login?intent=signup');
  });
});

describe('getAppProPlusSignupUrl', () => {
  it('points signup at the Pro+ upgrade settings entry', () => {
    const url = new URL(getAppProPlusSignupUrl());
    expect(url.searchParams.get('next')).toBe(PRO_PLUS_UPGRADE_PATH);
  });
});
