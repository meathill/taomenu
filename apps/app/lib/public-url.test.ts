import { afterEach, describe, expect, it } from 'vitest';
import { getAuthBaseUrl, getPublicAppUrl, getPublicWebsiteUrl, joinPublicUrl } from './public-url';

const KEYS = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_WEBSITE_URL', 'BETTER_AUTH_URL'] as const;

/** wrangler types 会把 ProcessEnv 收成字面量；测试里需要可写。 */
const env = process.env as Record<string, string | undefined>;

const originals = Object.fromEntries(KEYS.map((k) => [k, env[k]])) as Record<
  (typeof KEYS)[number],
  string | undefined
>;

afterEach(() => {
  for (const key of KEYS) {
    const value = originals[key];
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
});

describe('public-url', () => {
  it('默认回退到本地端口', () => {
    delete env.NEXT_PUBLIC_APP_URL;
    delete env.NEXT_PUBLIC_WEBSITE_URL;
    delete env.BETTER_AUTH_URL;

    expect(getPublicAppUrl()).toBe('http://localhost:3001');
    expect(getPublicWebsiteUrl()).toBe('http://localhost:3000');
    expect(getAuthBaseUrl()).toBe('http://localhost:3001');
  });

  it('去掉尾斜杠并读 NEXT_PUBLIC_*', () => {
    env.NEXT_PUBLIC_APP_URL = 'https://taomenu-app.example.workers.dev/';
    env.NEXT_PUBLIC_WEBSITE_URL = 'https://taomenu-website.example.workers.dev///';

    expect(getPublicAppUrl()).toBe('https://taomenu-app.example.workers.dev');
    expect(getPublicWebsiteUrl()).toBe('https://taomenu-website.example.workers.dev');
  });

  it('getAuthBaseUrl 优先 BETTER_AUTH_URL，否则 NEXT_PUBLIC_APP_URL', () => {
    env.NEXT_PUBLIC_APP_URL = 'https://app-public.example';
    env.BETTER_AUTH_URL = 'https://app-auth.example/';

    expect(getAuthBaseUrl()).toBe('https://app-auth.example');

    delete env.BETTER_AUTH_URL;
    expect(getAuthBaseUrl()).toBe('https://app-public.example');
  });

  it('joinPublicUrl 避免双斜杠', () => {
    expect(joinPublicUrl('https://app.example/', '/login')).toBe('https://app.example/login');
    expect(joinPublicUrl('https://app.example', 'login')).toBe('https://app.example/login');
  });
});
