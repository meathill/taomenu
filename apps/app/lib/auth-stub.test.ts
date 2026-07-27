import { describe, expect, it } from 'vitest';
import { DEV_SESSION_COOKIE, hasDevSession } from './auth-stub';

describe('hasDevSession', () => {
  it('无 cookie 时未登录', () => {
    expect(hasDevSession(null)).toBe(false);
  });

  it('识别开发会话 cookie', () => {
    expect(hasDevSession(`${DEV_SESSION_COOKIE}=1; other=2`)).toBe(true);
  });

  it('忽略错误值', () => {
    expect(hasDevSession(`${DEV_SESSION_COOKIE}=0`)).toBe(false);
  });
});
