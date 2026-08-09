#!/usr/bin/env node
/**
 * 一键在 Stripe 创建 TaoMenu 的两个订阅 Product 及其月付 Price：默认币种 VND，
 * 创建时就带上其余币种的 currency_options，金额全部取自 BILLING_PRICES。
 * 已配置且可用（active + 月付）的 Price 会跳过，不会重复建品。
 *
 * 用法（Node ≥ 24 直接跑 TS）：
 *   node scripts/create-stripe-products.ts               创建 Pro 与额外 Staff 席位
 *   node scripts/create-stripe-products.ts --only pro    只创建其中一个（pro | staff）
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

/** Price 的默认币种，创建后不可修改；其余币种走 currency_options */
const DEFAULT_CURRENCY = 'VND';

const TARGETS = [
  { product: 'pro_plan', envKey: 'STRIPE_PRO_PRICE_ID', label: 'Pro 月付', name: 'TaoMenu Pro' },
  {
    product: 'staff_seat',
    envKey: 'STRIPE_STAFF_SEAT_PRICE_ID',
    label: '额外 Staff 席位',
    name: 'TaoMenu Extra Staff Seat',
  },
] as const;

const ONLY_TO_PRODUCT: Record<string, string> = { pro: 'pro_plan', staff: 'staff_seat' };

type Target = (typeof TARGETS)[number];

type StripePrice = {
  id?: string;
  active?: boolean;
  type?: string;
  currency?: string;
  unit_amount?: number | null;
  recurring?: { interval?: string } | null;
};

function fail(message: string): never {
  console.error(`${message}\n用法：node scripts/create-stripe-products.ts [--only pro|staff]`);
  process.exit(1);
}

function parseArgs(): Target[] {
  const args = process.argv
    .slice(2)
    .flatMap((arg) => (arg.startsWith('--only=') ? ['--only', arg.slice(7)] : [arg]));
  const index = args.indexOf('--only');
  const only = index < 0 ? '' : (args[index + 1] ?? '');
  if (index >= 0) args.splice(index, 2);

  if (args.length > 0) fail(`未知参数：${args.join(' ')}`);
  if (only === '') return [...TARGETS];
  const picked = TARGETS.find((target) => target.product === ONLY_TO_PRODUCT[only]);
  if (!picked) fail(`--only 只接受 pro 或 staff，收到：${only}`);
  return [picked];
}

/** 只看前缀判断 mode，绝不打印 key 本身 */
function describeKeyMode(secretKey: string): string {
  if (/^(sk|rk)_test_/.test(secretKey)) return 'test（测试环境，可放心试跑）';
  if (/^(sk|rk)_live_/.test(secretKey)) return 'live（生产环境，创建的是真实商品）';
  return 'unknown（前缀无法识别，请确认用的是 Stripe Secret Key 或 Restricted Key）';
}

/** 已配置的 Price 能否直接复用；读不到多半是该 ID 属于另一个 mode 或另一个账号 */
async function inspectExisting(env: string, priceId: string, secretKey: string): Promise<string> {
  let price: StripePrice;
  try {
    price = await stripeRequest<StripePrice>(`/prices/${encodeURIComponent(priceId)}`, secretKey);
  } catch (error) {
    const message = redact(error instanceof Error ? error.message : String(error), secretKey);
    console.log(`  已配置 ${env}=${priceId}，但当前密钥读不到：${message}`);
    console.log('  常见原因是该 ID 属于另一个 mode（test/live）或另一个账号，将新建。');
    return '';
  }

  const monthly = price.type === 'recurring' && price.recurring?.interval === 'month';
  if (price.active === true && monthly) {
    const currency = (price.currency ?? '').toUpperCase();
    return `已存在，跳过创建（默认币种 ${currency} ${price.unit_amount}）`;
  }
  console.log(
    `  已配置的 Price ${priceId} 不可复用（active=${price.active}，type=${price.type}，` +
      `interval=${price.recurring?.interval ?? '-'}），将新建。`,
  );
  return '';
}

function buildPriceBody(target: Target, productId: string, withOptions: boolean): URLSearchParams {
  const local = BILLING_PRICES[target.product];
  const params = new URLSearchParams({
    product: productId,
    currency: DEFAULT_CURRENCY.toLowerCase(),
    unit_amount: String(local[DEFAULT_CURRENCY]),
    'recurring[interval]': 'month',
    'metadata[taomenu_product]': target.product,
  });
  if (!withOptions) return params;
  for (const currency of BILLING_CURRENCIES) {
    if (currency === DEFAULT_CURRENCY) continue;
    params.set(`currency_options[${currency.toLowerCase()}][unit_amount]`, String(local[currency]));
  }
  return params;
}

type Created = { productId: string; priceId: string; text: string };

async function createTarget(target: Target, secretKey: string): Promise<Created> {
  const productBody = new URLSearchParams({ name: target.name });
  productBody.set('metadata[taomenu_product]', target.product);
  const product = await stripeRequest<{ id?: string }>('/products', secretKey, productBody);
  const productId = product.id ?? '';
  console.log(`  已创建 Product：${productId}（${target.name}）`);

  const create = (withOptions: boolean) =>
    stripeRequest<StripePrice>(
      '/prices',
      secretKey,
      buildPriceBody(target, productId, withOptions),
    );
  try {
    const price = await create(true);
    return { productId, priceId: price.id ?? '', text: '已创建（含全部币种）' };
  } catch (error) {
    // 意外情况：Stripe 拒绝 currency_options。先把默认币种的 Price 建出来，其余币种交给同步脚本。
    console.log(
      `  带 currency_options 创建被拒绝：${redact(error instanceof Error ? error.message : String(error), secretKey)}`,
    );
    console.log('  回退为只创建默认币种 Price，其余币种稍后用 pnpm stripe:prices:sync 补推。');
    const price = await create(false);
    return {
      productId,
      priceId: price.id ?? '',
      text: `已创建（仅 ${DEFAULT_CURRENCY}，需跑 pnpm stripe:prices:sync 补齐其余币种）`,
    };
  }
}

type Outcome = Created & { target: Target; envStale: boolean; failed: boolean };

async function handleTarget(target: Target, priceId: string, secretKey: string): Promise<Outcome> {
  const local = BILLING_PRICES[target.product];
  const amounts = BILLING_CURRENCIES.map((item) => `${item} ${local[item]}`).join(' / ');
  console.log(`\n[${target.label}] ${target.name}`);
  console.log(`  本地价格（最小单位，默认币种 ${DEFAULT_CURRENCY}）：${amounts}`);

  if (priceId !== '') {
    const reusable = await inspectExisting(target.envKey, priceId, secretKey);
    if (reusable !== '') {
      console.log(`  ${reusable}`);
      return { target, text: reusable, productId: '', priceId, envStale: false, failed: false };
    }
  }

  const created = await createTarget(target, secretKey);
  console.log(`  已创建 Price：${created.priceId}`);
  return { ...created, target, envStale: priceId !== '', failed: false };
}

function printSummary(outcomes: Outcome[]): void {
  console.log('\n汇总：');
  printTable([
    ['商品', 'Product ID', 'Price ID', '结果'],
    ...outcomes.map((outcome) => [
      `${outcome.failed ? '✗' : '✓'} ${outcome.target.label}`,
      outcome.productId || '-',
      outcome.priceId || '-',
      outcome.text,
    ]),
  ]);

  const created = outcomes.filter((outcome) => !outcome.failed && outcome.productId !== '');
  if (created.length > 0) {
    console.log('\n下一步：');
    console.log('  1. 把下面几行写进 apps/app/.dev.vars（本地开发）：');
    for (const outcome of created)
      console.log(`       ${outcome.target.envKey}=${outcome.priceId}`);
    console.log('     生产环境改写 apps/app/wrangler.jsonc 里 vars 的同名字段。');
    console.log('  2. 运行 pnpm stripe:prices:check 验证四币种价格与本地配置一致。');
  }
  for (const outcome of outcomes.filter((item) => item.envStale)) {
    console.log(`  注意：${outcome.target.envKey} 原值在当前密钥下不可用，务必替换成上面的新 ID。`);
  }
}

async function main(): Promise<void> {
  const targets = parseArgs();
  const config = resolveConfig(['STRIPE_SECRET_KEY', ...TARGETS.map((target) => target.envKey)]);
  const secret = config.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('缺少 STRIPE_SECRET_KEY。可任选一种方式提供：');
    console.error('  1. 环境变量：STRIPE_SECRET_KEY=rk_... node scripts/create-stripe-products.ts');
    console.error('  2. 写入 apps/app/.dev.vars（本地开发用，勿提交）');
    console.error('  3. 从 Stripe Dashboard 复制 Restricted Key 后临时 export');
    process.exit(1);
  }
  const secretKey = secret.value;

  console.log(`Stripe API 版本：${STRIPE_API_VERSION}`);
  console.log(`STRIPE_SECRET_KEY 来源：${secret.source}`);
  console.log(`密钥模式：${describeKeyMode(secretKey)}`);

  const outcomes: Outcome[] = [];
  for (const target of targets) {
    try {
      outcomes.push(await handleTarget(target, config[target.envKey]?.value ?? '', secretKey));
    } catch (error) {
      const text = redact(error instanceof Error ? error.message : String(error), secretKey);
      console.error(`  失败：${text}`);
      outcomes.push({ target, text, productId: '', priceId: '', envStale: false, failed: true });
    }
  }

  printSummary(outcomes);
  if (outcomes.some((outcome) => outcome.failed)) process.exit(1);
}

await main();
