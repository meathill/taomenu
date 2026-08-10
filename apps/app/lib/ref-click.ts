/**
 * 代理商推广链接（?ref=CODE）归因链路里 app 独有的服务端纯函数：UTC 日期、访客指纹。
 * middleware、/api/public/ref-click 与客户端 RefTracker 共用，所以本文件不能引入
 * 任何服务端依赖（尤其是 @taomenu/db，会把 drizzle 拖进浏览器 bundle）。
 *
 * 参数名 / cookie 名 / 有效期 / code 校验放在 @taomenu/shared/ref，与营销站共用同一份契约，
 * 这里原样转出，app 内各处仍从 '@/lib/ref-click' 单点引入。
 * 注意 cookie 写入时 host-only（不设 domain），避开 .dyqr.me 根域上另一个 better-auth 站点。
 */

export {
  normalizeRefCode,
  REF_COOKIE_MAX_AGE_SECONDS,
  REF_COOKIE_NAME,
  REF_QUERY_PARAM,
} from '@taomenu/shared/ref';

/** UTC 'YYYY-MM-DD'，与 agent_link_clicks.day 的口径一致。 */
export function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Cloudflare 的 cf-connecting-ip 最可信；退回 x-forwarded-for 的第一个（最靠近客户端的）值。 */
export function readClientIp(headers: Headers): string {
  const connecting = headers.get('cf-connecting-ip')?.trim();
  if (connecting) {
    return connecting;
  }
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}

export type VisitorFingerprintInput = {
  ip: string;
  userAgent: string;
  /** UTC 'YYYY-MM-DD' */
  day: string;
  /** 已归一化的推广码 */
  code: string;
};

/** 指纹原文只用于哈希，绝不落库——DB 里只存 sha256，不留 IP / UA 这类 PII。 */
export function buildVisitorFingerprint(input: VisitorFingerprintInput): string {
  return [input.ip, input.userAgent, input.day, input.code].join('|');
}

export async function computeVisitorHash(input: VisitorFingerprintInput): Promise<string> {
  return sha256Hex(buildVisitorFingerprint(input));
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
