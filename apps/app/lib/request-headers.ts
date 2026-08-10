/**
 * better-auth 回调（emailOTP endpoint ctx、databaseHooks ctx）拿到的上下文形状随版本变化，
 * 统一在这里做防御式读取，调用方拿到的要么是 Headers 要么是 null。
 */
export function extractRequestHeaders(ctx: unknown): Headers | null {
  if (!ctx || typeof ctx !== 'object') {
    return null;
  }
  const record = ctx as Record<string, unknown>;
  if (record.request instanceof Request) {
    return record.request.headers;
  }
  if (record.headers instanceof Headers) {
    return record.headers;
  }
  return null;
}

/**
 * 从 Cookie 请求头里取指定 cookie 的值，取不到返回 null。
 * 值不做 URL 解码：本项目写入的 cookie 值都是 token 形态（无需转义）。
 */
export function readCookieValue(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) {
      continue;
    }
    if (part.slice(0, separator).trim() !== name) {
      continue;
    }
    return part.slice(separator + 1).trim() || null;
  }
  return null;
}
