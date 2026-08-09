#!/usr/bin/env node
/**
 * 把 packages/shared 里的多币种价格推送到 Stripe Price 的 currency_options。
 *
 * 用法（Node ≥ 24 直接跑 TS）：
 *   node scripts/sync-stripe-prices.ts --check   仅对比，不写；有漂移 exit 1
 *   node scripts/sync-stripe-prices.ts           有漂移时覆盖式写回 Stripe
 *
 * 方向永远是「本地配置 → Stripe」，应用运行时不读 Stripe 价格。
 * Stripe 限制：Price 的默认币种与其金额创建后不可修改，只有 currency_options 可更新。
 */
import { existsSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Node 原生跑 TS 时不会给无扩展名的相对导入补 .ts，而 shared 包内部就是这种写法。
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // 补 .ts 失败就落回默认解析，让原始错误暴露出来
      }
    }
    return nextResolve(specifier, context);
  },
});

const STRIPE_API_URL = 'https://api.stripe.com/v1';
const STRIPE_API_VERSION = '2026-04-22.dahlia';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEV_VARS_PATH = resolve(REPO_ROOT, 'apps/app/.dev.vars');
const WRANGLER_PATH = resolve(REPO_ROOT, 'apps/app/wrangler.jsonc');
const SHARED_SRC = resolve(REPO_ROOT, 'packages/shared/src');

type CurrencyModule = { BILLING_CURRENCIES: readonly string[] };
type PricingModule = { BILLING_PRICES: Record<string, Record<string, number>> };

const { BILLING_CURRENCIES } = (await import(`${SHARED_SRC}/currency.ts`)) as CurrencyModule;
const { BILLING_PRICES } = (await import(`${SHARED_SRC}/pricing.ts`)) as PricingModule;

const TARGETS = [
  { product: 'pro_plan', envKey: 'STRIPE_PRO_PRICE_ID', label: 'Pro 月付' },
  { product: 'staff_seat', envKey: 'STRIPE_STAFF_SEAT_PRICE_ID', label: '额外 Staff 席位' },
] as const;

/** KEY=VALUE 文本（.dev.vars 风格）：跳过注释与空行，剥掉包裹引号，空值当作未配置 */
function readKeyValueFile(path: string): Record<string, string> {
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
function readWranglerVars(path: string): Record<string, string> {
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

type Resolved = { value: string; source: string };

/** 凭据优先级：process.env → apps/app/.dev.vars → apps/app/wrangler.jsonc 的 vars */
function resolveConfig(): Record<string, Resolved | undefined> {
  const keys = ['STRIPE_SECRET_KEY', ...TARGETS.map((target) => target.envKey)];
  const needFallback = keys.some((key) => !process.env[key]);
  const devVars = needFallback ? readKeyValueFile(DEV_VARS_PATH) : {};
  const wranglerVars = needFallback ? readWranglerVars(WRANGLER_PATH) : {};

  const resolved: Record<string, Resolved | undefined> = {};
  for (const key of keys) {
    // secret 不从 wrangler.jsonc 取：那里只放非密钥配置
    const fromWrangler = key === 'STRIPE_SECRET_KEY' ? '' : wranglerVars[key];
    resolved[key] = [
      { value: process.env[key] ?? '', source: '环境变量' },
      { value: devVars[key] ?? '', source: 'apps/app/.dev.vars' },
      { value: fromWrangler ?? '', source: 'apps/app/wrangler.jsonc' },
    ].find((candidate) => candidate.value !== '');
  }
  return resolved;
}

/** 保证任何输出都不含 secret：先剔除完整 key，再把残留的 sk_/rk_ 串打码 */
function redact(text: string, secretKey: string): string {
  return text
    .split(secretKey)
    .join('***')
    .replace(/\b(sk|rk)_[A-Za-z0-9_]+/g, '$1_***');
}

type StripePrice = {
  id?: string;
  active?: boolean;
  type?: string;
  currency?: string;
  unit_amount?: number | null;
  recurring?: { interval?: string } | null;
  currency_options?: Record<string, { unit_amount?: number | null }>;
};

async function stripeRequest(
  path: string,
  secretKey: string,
  body?: URLSearchParams,
): Promise<StripePrice> {
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
  const data = (await response.json().catch(() => ({}))) as StripePrice & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(redact(data.error?.message ?? `Stripe HTTP ${response.status}`, secretKey));
  }
  return data;
}

/** 终端里 CJK 占两列，padEnd 只按字符数补，需自己算宽度 */
function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) width += char.codePointAt(0)! > 0x2e7f ? 2 : 1;
  return width;
}

function printTable(rows: string[][]): void {
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

type DiffRow = { currency: string; remote: number | null; local: number | null; status: string };

function buildDiff(price: StripePrice, local: Record<string, number>): DiffRow[] {
  const options = price.currency_options ?? {};
  const rows: DiffRow[] = BILLING_CURRENCIES.map((currency) => {
    const remote = options[currency.toLowerCase()]?.unit_amount ?? null;
    const expected = local[currency];
    return {
      currency,
      remote,
      local: expected,
      status: remote === null ? '缺失' : remote === expected ? '一致' : '不一致',
    };
  });
  for (const key of Object.keys(options)) {
    const upper = key.toUpperCase();
    if (BILLING_CURRENCIES.includes(upper)) continue;
    rows.push({
      currency: upper,
      remote: options[key]?.unit_amount ?? null,
      local: null,
      status: '多余（将移除）',
    });
  }
  return rows;
}

function formatAmount(amount: number | null): string {
  return amount === null ? '-' : String(amount);
}

/** currency_options 是覆盖式提交：不在列表里的币种会被 Stripe 移除 */
function buildUpdateBody(local: Record<string, number>, skipCurrency?: string): URLSearchParams {
  const params = new URLSearchParams();
  for (const currency of BILLING_CURRENCIES) {
    if (currency === skipCurrency) continue;
    params.set(`currency_options[${currency.toLowerCase()}][unit_amount]`, String(local[currency]));
  }
  return params;
}

/** 校验 Price 形态，返回默认币种（大写）；不合规直接抛错 */
function assertPriceShape(price: StripePrice, local: Record<string, number>): string {
  if (price.active !== true) throw new Error('Price 未启用（active !== true）');
  if (price.type !== 'recurring' || price.recurring?.interval !== 'month') {
    throw new Error(
      `Price 不是月付订阅（type=${price.type}, interval=${price.recurring?.interval}）`,
    );
  }
  const currency = (price.currency ?? '').toUpperCase();
  if (!BILLING_CURRENCIES.includes(currency)) {
    throw new Error(`Price 默认币种 ${currency || '(空)'} 不在 ${BILLING_CURRENCIES.join('/')} 内`);
  }
  if (price.unit_amount !== local[currency]) {
    throw new Error(
      `Price 默认币种 ${currency} 金额为 ${price.unit_amount}，本地配置是 ${local[currency]}。` +
        'Stripe 不允许修改默认币种金额，请在 Dashboard 新建 Price 并更新对应环境变量。',
    );
  }
  return currency;
}

type Outcome = { label: string; text: string; failed: boolean };

async function pushCurrencyOptions(
  priceId: string,
  secretKey: string,
  local: Record<string, number>,
  defaultCurrency: string,
): Promise<string> {
  const path = `/prices/${encodeURIComponent(priceId)}`;
  try {
    await stripeRequest(path, secretKey, buildUpdateBody(local));
    return '已同步';
  } catch (error) {
    // 文档未明确默认币种能否重复出现在 currency_options；被拒时去掉它再试一次
    // （默认币种金额本就不可改，且上面已校验与本地一致）。
    await stripeRequest(path, secretKey, buildUpdateBody(local, defaultCurrency)).catch(() => {
      throw error;
    });
    return `已同步（默认币种 ${defaultCurrency} 被 Stripe 拒绝写入 currency_options，已跳过）`;
  }
}

async function handleTarget(
  target: (typeof TARGETS)[number],
  priceId: string,
  secretKey: string,
  checkOnly: boolean,
): Promise<Outcome> {
  const local = BILLING_PRICES[target.product];
  console.log(`\n[${target.label}] ${target.envKey}=${priceId}`);

  const price = await stripeRequest(
    `/prices/${encodeURIComponent(priceId)}?expand[]=currency_options`,
    secretKey,
  );
  const defaultCurrency = assertPriceShape(price, local);
  console.log(`  默认币种 ${defaultCurrency}（${price.unit_amount}），与本地配置一致`);

  const rows = buildDiff(price, local);
  printTable([
    ['币种', 'Stripe 现值', '本地配置', '状态'],
    ...rows.map((row) => [
      row.currency,
      formatAmount(row.remote),
      formatAmount(row.local),
      row.status,
    ]),
  ]);

  const drifted = rows.filter((row) => row.status !== '一致');
  if (drifted.length === 0) {
    console.log('  currency_options 已与本地配置一致，无需同步');
    return { label: target.label, text: '已一致', failed: false };
  }
  if (checkOnly) {
    console.log(`  存在 ${drifted.length} 项漂移，运行 pnpm stripe:prices:sync 推送`);
    return { label: target.label, text: `${drifted.length} 项漂移待同步`, failed: true };
  }

  const text = await pushCurrencyOptions(priceId, secretKey, local, defaultCurrency);
  console.log(`  ${text}`);
  return { label: target.label, text, failed: false };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== '--check');
  if (unknown.length > 0) {
    console.error(
      `未知参数：${unknown.join(' ')}\n用法：node scripts/sync-stripe-prices.ts [--check]`,
    );
    process.exit(1);
  }
  const checkOnly = args.includes('--check');

  const config = resolveConfig();
  const secret = config.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('缺少 STRIPE_SECRET_KEY。可任选一种方式提供：');
    console.error('  1. 环境变量：STRIPE_SECRET_KEY=rk_... node scripts/sync-stripe-prices.ts');
    console.error('  2. 写入 apps/app/.dev.vars（本地开发用，勿提交）');
    console.error('  3. 从 Stripe Dashboard 复制 Restricted Key 后临时 export');
    process.exit(1);
  }
  const secretKey = secret.value;

  console.log(`模式：${checkOnly ? '只检查（--check）' : '同步写入'}`);
  console.log(`Stripe API 版本：${STRIPE_API_VERSION}`);
  console.log(`STRIPE_SECRET_KEY 来源：${secret.source}`);

  const outcomes: Outcome[] = [];
  const skipped: string[] = [];
  for (const target of TARGETS) {
    const priceId = config[target.envKey];
    if (!priceId) {
      skipped.push(`${target.label}（${target.envKey} 未配置）`);
      continue;
    }
    try {
      outcomes.push(await handleTarget(target, priceId.value, secretKey, checkOnly));
    } catch (error) {
      const message = redact(error instanceof Error ? error.message : String(error), secretKey);
      console.error(`  失败：${message}`);
      outcomes.push({ label: target.label, text: message, failed: true });
    }
  }

  console.log('\n汇总：');
  for (const outcome of outcomes) {
    console.log(`  ${outcome.failed ? '✗' : '✓'} ${outcome.label}：${outcome.text}`);
  }
  for (const item of skipped) console.log(`  - 跳过 ${item}`);
  if (skipped.length > 0) {
    console.log('  提示：未配置的 Price ID 补齐后请重新运行，对应功能在线上会显示为未开通。');
  }

  if (outcomes.some((outcome) => outcome.failed)) process.exit(1);
}

await main();
