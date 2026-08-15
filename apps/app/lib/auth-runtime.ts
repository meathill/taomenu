import { AsyncLocalStorage } from 'node:async_hooks';

/** 与 better-auth 内部 `Symbol.for('better-auth:global')` 对齐。 */
export const BETTER_AUTH_GLOBAL = Symbol.for('better-auth:global');

export const AUTH_HANDLER_TIMEOUT_MS = 10_000;

export const AUTH_HANG = Symbol('auth-handler-hang');

type BetterAuthGlobal = {
  version: string;
  epoch: number;
  context: {
    requestStateAsyncStorage?: AsyncLocalStorage<unknown>;
    endpointContextAsyncStorage?: AsyncLocalStorage<unknown>;
    adapterAsyncStorage?: AsyncLocalStorage<unknown>;
  };
};

/**
 * 用静态 import 的 AsyncLocalStorage 预热 better-auth 的三个 ALS。
 * Workers 里请求期 `import("node:async_hooks")` 被取消后会永远 pending，
 * 预热后 better-auth 不会再走那条动态 import。
 */
export function seedBetterAuthAsyncStorage(): void {
  const holder = globalThis as typeof globalThis & {
    [BETTER_AUTH_GLOBAL]?: BetterAuthGlobal;
  };
  let shared = holder[BETTER_AUTH_GLOBAL];
  if (!shared) {
    shared = { version: 'seed', epoch: 0, context: {} };
    holder[BETTER_AUTH_GLOBAL] = shared;
  }
  if (!shared.context.requestStateAsyncStorage) {
    shared.context.requestStateAsyncStorage = new AsyncLocalStorage();
  }
  if (!shared.context.endpointContextAsyncStorage) {
    shared.context.endpointContextAsyncStorage = new AsyncLocalStorage();
  }
  if (!shared.context.adapterAsyncStorage) {
    shared.context.adapterAsyncStorage = new AsyncLocalStorage();
  }
}

seedBetterAuthAsyncStorage();

export async function raceTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | typeof AUTH_HANG> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof AUTH_HANG>((resolve) => {
    timer = setTimeout(() => resolve(AUTH_HANG), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    promise.catch(() => undefined);
  }
}

export function authTimeoutResponse(): Response {
  return new Response(
    JSON.stringify({ message: 'Authentication service timed out. Please try again.' }),
    {
      status: 503,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    },
  );
}

/** Better Auth catch-all：打点 + 超时，避免无限 pending。 */
export async function handleAuthRequest(
  request: Request,
  handler: (request: Request) => Promise<Response>,
  timeoutMs = AUTH_HANDLER_TIMEOUT_MS,
): Promise<Response> {
  const url = new URL(request.url);
  console.info('[auth] start', request.method, url.pathname);
  const result = await raceTimeout(handler(request), timeoutMs);
  if (result === AUTH_HANG) {
    console.error('[auth] timeout', request.method, url.pathname);
    return authTimeoutResponse();
  }
  return result;
}
