import { isLocale, type Locale } from '@taomenu/shared';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { toStripeCheckoutLocale } from './stripe';

/** 优先用客户端显式传入的 UI 语言，其次 next-intl / NEXT_LOCALE cookie。 */
export async function resolveCheckoutLocale(requested?: string | null): Promise<Locale> {
  if (isLocale(requested)) return requested;
  try {
    return toStripeCheckoutLocale(await getLocale());
  } catch {
    const cookie = (await cookies()).get('NEXT_LOCALE')?.value;
    return toStripeCheckoutLocale(cookie);
  }
}
