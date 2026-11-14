import { getActiveStoreBySlug } from '@taomenu/db';
import { isLocale } from '@taomenu/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/db';
import { buildCustomerMetadataTitle } from './customer-document-title';

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** 公开菜单页的 metadata：跟随 ?locale=，店名用显示名而不是 slug */
export async function getPublicMenuMetadata(input: {
  storeSlug: string;
  pageKey: 'pickupMode' | 'menu';
  searchParams?: Promise<{ locale?: string | string[] }> | { locale?: string | string[] };
}) {
  const query = input.searchParams ? await input.searchParams : undefined;
  const requested = firstSearchParam(query?.locale);
  const locale = isLocale(requested) ? requested : await getLocale();
  const t = await getTranslations({ locale, namespace: 'customer' });
  let storeName = input.storeSlug;
  try {
    const store = await getActiveStoreBySlug(getDb(), input.storeSlug);
    if (store?.name) storeName = store.name;
  } catch {
    // metadata 失败时回退 slug，页面本身仍可正常打开
  }
  return {
    title: buildCustomerMetadataTitle(t(input.pageKey), storeName),
    robots: { index: false, follow: false },
  };
}
