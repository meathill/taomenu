import type { BillingInterval } from '@taomenu/shared';

export type BillingPath = 'pro/checkout' | 'pro-plus/checkout' | 'portal';

export type BillingUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: 'BILLING_NOT_CONFIGURED' | 'BILLING_FAILED' };

/** 调现有 Stripe 结算接口，拿到跳转地址；设置页与付费墙共用 */
export async function requestBillingUrl(
  storeId: string,
  path: BillingPath,
  options?: { locale?: string; interval?: BillingInterval },
): Promise<BillingUrlResult> {
  try {
    const response = await fetch(`/api/owner/stores/${storeId}/billing/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: options?.locale, interval: options?.interval }),
    });
    const data = (await response.json().catch(() => null)) as {
      error?: string;
      url?: string;
    } | null;
    if (response.ok && data?.url) {
      return { ok: true, url: data.url };
    }
    return {
      ok: false,
      error: data?.error === 'BILLING_NOT_CONFIGURED' ? 'BILLING_NOT_CONFIGURED' : 'BILLING_FAILED',
    };
  } catch {
    return { ok: false, error: 'BILLING_FAILED' };
  }
}
