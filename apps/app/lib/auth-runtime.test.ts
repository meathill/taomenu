import { AsyncLocalStorage } from 'node:async_hooks';
import { describe, expect, it } from 'vitest';
import {
  AUTH_HANG,
  BETTER_AUTH_GLOBAL,
  handleAuthRequest,
  raceTimeout,
  seedBetterAuthAsyncStorage,
} from './auth-runtime';

type SeededGlobal = {
  context: {
    requestStateAsyncStorage?: AsyncLocalStorage<unknown>;
    endpointContextAsyncStorage?: AsyncLocalStorage<unknown>;
    adapterAsyncStorage?: AsyncLocalStorage<unknown>;
  };
};

function readSeededGlobal(): SeededGlobal {
  const shared = (globalThis as Record<symbol, SeededGlobal | undefined>)[BETTER_AUTH_GLOBAL];
  if (!shared) {
    throw new Error('better-auth global was not seeded');
  }
  return shared;
}

describe('seedBetterAuthAsyncStorage', () => {
  it('把三个 ALS 种进 better-auth global', () => {
    seedBetterAuthAsyncStorage();
    const shared = readSeededGlobal();
    expect(shared.context.requestStateAsyncStorage).toBeInstanceOf(AsyncLocalStorage);
    expect(shared.context.endpointContextAsyncStorage).toBeInstanceOf(AsyncLocalStorage);
    expect(shared.context.adapterAsyncStorage).toBeInstanceOf(AsyncLocalStorage);
  });

  it('重复调用不替换已有实例', () => {
    seedBetterAuthAsyncStorage();
    const first = readSeededGlobal().context.requestStateAsyncStorage;
    seedBetterAuthAsyncStorage();
    expect(readSeededGlobal().context.requestStateAsyncStorage).toBe(first);
  });
});

describe('raceTimeout', () => {
  it('在时限内返回结果', async () => {
    await expect(raceTimeout(Promise.resolve(42), 50)).resolves.toBe(42);
  });

  it('超时返回 AUTH_HANG', async () => {
    await expect(raceTimeout(new Promise(() => undefined), 20)).resolves.toBe(AUTH_HANG);
  });
});

describe('handleAuthRequest', () => {
  it('正常响应原样返回', async () => {
    const request = new Request('https://app.example.com/api/auth/ok');
    const response = await handleAuthRequest(
      request,
      async () => new Response('ok', { status: 200 }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });

  it('超时返回 503 且禁止缓存', async () => {
    const request = new Request('https://app.example.com/api/auth/get-session');
    const response = await handleAuthRequest(request, () => new Promise(() => undefined), 20);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      message: 'Authentication service timed out. Please try again.',
    });
  });
});
