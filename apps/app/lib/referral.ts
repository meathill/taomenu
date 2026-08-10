import { attributeUserToAgent } from '@taomenu/db';
import { getDb } from '@/lib/db';
import { normalizeRefCode, REF_COOKIE_NAME } from '@/lib/ref-click';
import { extractRequestHeaders, readCookieValue } from '@/lib/request-headers';

/**
 * better-auth 的 databaseHooks 不保证一定带得到请求上下文，这里兜一手 Next 的请求作用域。
 * 动态 import：hook 可能在非 Next 请求作用域里执行，静态引入会直接抛。
 */
async function readRefCodeFromRequestScope(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers');
    const store = await cookies();
    return store.get(REF_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * 注册成功后把新用户归因给推广码对应的代理商。
 * 首触优先由 agent_referrals 的主键保证（见 attributeUserToAgent），这里不做二次判断。
 * 整体 try/catch 吞掉所有异常：归因是附加价值，绝不能阻断注册。
 */
export async function attributeSignupFromCookie(userId: string, ctx?: unknown): Promise<void> {
  try {
    const headers = extractRequestHeaders(ctx);
    const rawCode =
      readCookieValue(headers?.get('cookie'), REF_COOKIE_NAME) ??
      (await readRefCodeFromRequestScope());

    const code = normalizeRefCode(rawCode);
    if (!code) {
      return;
    }

    await attributeUserToAgent(getDb(), { userId, code });
  } catch {
    // 静默：代理商归因失败不影响用户注册
  }
}
