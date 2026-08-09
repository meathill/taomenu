/**
 * Stripe 运维脚本的公共部分：路径常量、凭据解析、REST 调用、终端表格。
 *
 * 只被 scripts/ 下的入口脚本使用（Node ≥ 24 直接跑 TS）。
 * 入口脚本各自负责 `module.registerHooks`，因为补 `.ts` 扩展名的钩子
 * 必须在动态 import packages/shared 之前注册。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STRIPE_API_URL = 'https://api.stripe.com/v1';
export const STRIPE_API_VERSION = '2026-04-22.dahlia';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEV_VARS_PATH = resolve(REPO_ROOT, 'apps/app/.dev.vars');
export const WRANGLER_PATH = resolve(REPO_ROOT, 'apps/app/wrangler.jsonc');
export const SHARED_SRC = resolve(REPO_ROOT, 'packages/shared/src');

/** KEY=VALUE 文本（.dev.vars 风格）：跳过注释与空行，剥掉包裹引号，空值当作未配置 */
export function readKeyValueFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trimStart().startsWith('#')) continue;
    const matched = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!matched) continue;
    const value = matched[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    if (value !== '') values[matched[1]] = value;
  }
  return values;
}

/** wrangler.jsonc 的 vars（JSONC 有行注释和尾逗号，做容错） */
export function readWranglerVars(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1');
  const config = JSON.parse(text) as { vars?: Record<string, unknown> };
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.vars ?? {})) {
    if (typeof value === 'string' && value !== '') vars[key] = value;
  }
  return vars;
}

export type Resolved = { value: string; source: string };

/**
 * 凭据优先级：process.env → apps/app/.dev.vars → apps/app/wrangler.jsonc 的 vars。
 * secretKeys 里的 key 不从 wrangler.jsonc 取：那里只放非密钥配置。
 */
export function resolveConfig(
  keys: readonly string[],
  secretKeys: readonly string[] = ['STRIPE_SECRET_KEY'],
): Record<string, Resolved | undefined> {
  const needFallback = keys.some((key) => !process.env[key]);
  const devVars = needFallback ? readKeyValueFile(DEV_VARS_PATH) : {};
  const wranglerVars = needFallback ? readWranglerVars(WRANGLER_PATH) : {};

  const resolved: Record<string, Resolved | undefined> = {};
  for (const key of keys) {
    const fromWrangler = secretKeys.includes(key) ? '' : wranglerVars[key];
    resolved[key] = [
      { value: process.env[key] ?? '', source: '环境变量' },
      { value: devVars[key] ?? '', source: 'apps/app/.dev.vars' },
      { value: fromWrangler ?? '', source: 'apps/app/wrangler.jsonc' },
    ].find((candidate) => candidate.value !== '');
  }
  return resolved;
}

/** 保证任何输出都不含 secret：先剔除完整 key，再把残留的 sk_/rk_ 串打码 */
export function redact(text: string, secretKey: string): string {
  return text
    .split(secretKey)
    .join('***')
    .replace(/\b(sk|rk)_[A-Za-z0-9_]+/g, '$1_***');
}

/** 有 body 走 POST（form-urlencoded），否则 GET；错误信息已打码 */
export async function stripeRequest<T>(
  path: string,
  secretKey: string,
  body?: URLSearchParams,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    'Stripe-Version': STRIPE_API_VERSION,
  };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';

  const response = await fetch(`${STRIPE_API_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(redact(data.error?.message ?? `Stripe HTTP ${response.status}`, secretKey));
  }
  return data;
}

/** 终端里 CJK 占两列，padEnd 只按字符数补，需自己算宽度 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) width += char.codePointAt(0)! > 0x2e7f ? 2 : 1;
  return width;
}

export function printTable(rows: string[][]): void {
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((row) => displayWidth(row[column]))),
  );
  for (const row of rows) {
    const line = row
      .map((cell, column) => cell + ' '.repeat(widths[column] - displayWidth(cell)))
      .join('   ');
    console.log(`    ${line.trimEnd()}`);
  }
}
