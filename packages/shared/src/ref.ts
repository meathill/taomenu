/**
 * 代理商推广链接（`?ref=CODE`）的跨端契约：query 参数名、cookie 名与有效期、推广码校验，
 * 以及营销站改写站外链接、读写中转 cookie 用到的纯字符串函数。
 *
 * app（middleware / 上报接口 / RefTracker）与 website（RefPassthrough）共用同一份定义，
 * 避免两边的校验规则或 cookie 名各自漂移导致归因静默失效。
 * 因此本文件不得引入任何运行时依赖，也不得依赖 DOM / Node API。
 */

/** URL 上承载推广码的 query 参数名。 */
export const REF_QUERY_PARAM = 'ref';

/**
 * 归因 cookie 名。app 侧由 middleware 写 httpOnly cookie；
 * website 侧只是中转，用普通 js cookie 即可（同名不同域，互不影响）。
 */
export const REF_COOKIE_NAME = 'tm_ref';

/** 归因窗口 30 天。 */
export const REF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * 实际生成的推广码是 8 位（见 packages/db generateAgentCode），
 * 这里放宽到 4~16 位，只做「像不像推广码」的粗筛，真正有效性由 DB 查询决定。
 */
const REF_CODE_PATTERN = /^[A-Z0-9]{4,16}$/i;

/** 校验并归一化推广码（trim + 大写）；不合法返回 null。 */
export function normalizeRefCode(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!REF_CODE_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed.toUpperCase();
}

/** 从 `document.cookie` 这类 `a=1; b=2` 字符串里取出推广码；缺失或不合法都返回 null。 */
export function readRefCookie(cookieString: string): string | null {
  for (const part of cookieString.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    if (part.slice(0, separator).trim() !== REF_COOKIE_NAME) {
      continue;
    }
    return normalizeRefCode(part.slice(separator + 1).trim());
  }
  return null;
}

/**
 * 生成写入 `document.cookie` 的字符串。
 * 只在 https 下加 Secure，否则本地 http 调试写不进去。
 */
export function buildRefCookie(code: string, options: { secure: boolean }): string {
  const attributes = [
    `${REF_COOKIE_NAME}=${code}`,
    `Max-Age=${REF_COOKIE_MAX_AGE_SECONDS}`,
    'Path=/',
    'SameSite=Lax',
  ];
  if (options.secure) {
    attributes.push('Secure');
  }
  return attributes.join('; ');
}

/**
 * 给指向 app 的链接补上 ref 参数，返回改写后的 URL；
 * 非 app 链接、已带 ref、URL 非法都返回 null（表示无需改写）。
 * `href` 需为绝对地址（`anchor.href` 天然如此）。
 */
export function appendRefToAppLink(href: string, appUrl: string, code: string): string | null {
  let target: URL;
  let app: URL;
  try {
    target = new URL(href);
    app = new URL(appUrl);
  } catch {
    return null;
  }

  if (target.origin !== app.origin) {
    return null;
  }
  // app URL 带子路径时（部署形态变化的余地），只改写该子路径下的链接
  const basePath = app.pathname.replace(/\/+$/, '');
  if (basePath && !target.pathname.startsWith(basePath)) {
    return null;
  }
  if (target.searchParams.has(REF_QUERY_PARAM)) {
    return null;
  }

  target.searchParams.set(REF_QUERY_PARAM, code);
  return target.toString();
}
