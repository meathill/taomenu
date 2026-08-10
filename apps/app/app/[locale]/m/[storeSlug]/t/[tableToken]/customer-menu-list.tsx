'use client';

import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { publicMediaPath } from '@/lib/menu-image';
import type { PublicMenuItem } from '../../../modifier-picker';

type MenuCategoryView = {
  id: string;
  name: string;
  items: PublicMenuItem[];
};

type CustomerMenuListProps = {
  storeName: string;
  tableName?: string;
  acceptingPublicRequests: boolean;
  categories: MenuCategoryView[];
  currency: string;
  svcBusy: boolean;
  svcMsg: string | null;
  onSendService: (type: 'call_staff' | 'request_bill') => void;
  onPickItem: (item: PublicMenuItem) => void;
};

export function CustomerMenuList({
  storeName,
  tableName,
  acceptingPublicRequests,
  categories,
  currency,
  svcBusy,
  svcMsg,
  onSendService,
  onPickItem,
}: CustomerMenuListProps) {
  const t = useTranslations('customer');
  const locale = useLocale();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-paper-50/95 px-4 py-4 backdrop-blur">
        <p className="text-sm font-semibold text-brand-600">{storeName}</p>
        <h1 className="text-xl font-extrabold text-ink-900">
          {tableName ? t('tableLabel', { name: tableName }) : t('menu')}
        </h1>
        {!acceptingPublicRequests ? (
          <p className="mt-1 text-xs font-semibold text-brand-600">{t('paused')}</p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={svcBusy}
            onClick={() => onSendService('call_staff')}
            className="min-h-10 flex-1 rounded-xl border border-border text-xs font-bold"
          >
            {t('callStaff')}
          </button>
          <button
            type="button"
            disabled={svcBusy}
            onClick={() => onSendService('request_bill')}
            className="min-h-10 flex-1 rounded-xl border border-border text-xs font-bold"
          >
            {t('requestBill')}
          </button>
        </div>
        {svcMsg ? <p className="mt-2 text-xs font-medium text-jade-600">{svcMsg}</p> : null}
      </header>

      {categories.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">{t('menuUnpublished')}</p>
      ) : (
        <ul className="space-y-6 px-4 py-4">
          {categories.map((category) => (
            <li key={category.id}>
              <h2 className="mb-2 text-sm font-bold tracking-wide text-terracotta-600 uppercase">
                {category.name}
              </h2>
              <ul className="space-y-2">
                {category.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={item.isSoldOut || !acceptingPublicRequests}
                      onClick={() => onPickItem(item)}
                      className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-left disabled:opacity-50"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {item.imageKey ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={publicMediaPath(item.imageKey)}
                            alt=""
                            className="size-12 shrink-0 rounded-xl object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink-900">
                            {item.name}
                          </span>
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {formatCurrency(item.priceAmount, currency, locale)}
                            {item.isSoldOut ? ` · ${t('soldOut')}` : ''}
                            {(item.modifierGroups?.length ?? 0) > 0 ? ` · ${t('options')}` : ''}
                          </span>
                        </span>
                      </span>
                      <span className="text-sm font-bold text-brand-600">+</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
