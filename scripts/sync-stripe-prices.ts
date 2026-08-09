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
import { registerHooks } from 'node:module';
import {
  printTable,
  redact,
  resolveConfig,
  SHARED_SRC,
  STRIPE_API_VERSION,
  stripeRequest,
} from './stripe-common.ts';

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

type CurrencyModule = { BILLING_CURRENCIES: readonly string[] };
type PricingModule = { BILLING_PRICES: Record<string, Record<string, number>> };

const { BILLING_CURRENCIES } = (await import(`${SHARED_SRC}/currency.ts`)) as CurrencyModule;
const { BILLING_PRICES } = (await import(`${SHARED_SRC}/pricing.ts`)) as PricingModule;

const TARGETS = [
  { product: 'pro_plan', envKey: 'STRIPE_PRO_PRICE_ID', label: 'Pro 月付' },
  { product: 'staff_seat', envKey: 'STRIPE_STAFF_SEAT_PRICE_ID', label: '额外 Staff 席位' },
] as const;

type StripePrice = {
  id?: string;
  active?: boolean;
  type?: string;
  currency?: string;
  unit_amount?: number | null;
  recurring?: { interval?: string } | null;
  currency_options?: Record<string, { unit_amount?: number | null }>;
};

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
    await stripeRequest<StripePrice>(path, secretKey, buildUpdateBody(local));
    return '已同步';
  } catch (error) {
    // 文档未明确默认币种能否重复出现在 currency_options；被拒时去掉它再试一次
    // （默认币种金额本就不可改，且上面已校验与本地一致）。
    const retryBody = buildUpdateBody(local, defaultCurrency);
    await stripeRequest<StripePrice>(path, secretKey, retryBody).catch(() => {
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

  const price = await stripeRequest<StripePrice>(
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

  const config = resolveConfig(['STRIPE_SECRET_KEY', ...TARGETS.map((target) => target.envKey)]);
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
