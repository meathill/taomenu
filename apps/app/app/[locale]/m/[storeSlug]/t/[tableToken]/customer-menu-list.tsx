'use client';

import { useTranslations } from 'next-intl';
import { CustomerMenuCategories } from '../../../customer-menu-categories';
import { CustomerMenuCover } from '../../../customer-menu-cover';
import type { PublicMenuItem } from '../../../modifier-picker';
import { CustomerLanguageSelect } from '../../customer-language-select';

type MenuCategoryView = {
  id: string;
  name: string;
  items: PublicMenuItem[];
};

type CustomerMenuListProps = {
  storeName: string;
  coverImageKey?: string | null;
  tableName?: string;
  acceptingPublicRequests: boolean;
  categories: MenuCategoryView[];
  currency: string;
  availableLocales: string[];
  resolvedLocale: string;
  svcBusy: boolean;
  svcMsg: string | null;
  onSendService: (type: 'call_staff' | 'request_bill') => void;
  onPickItem: (item: PublicMenuItem) => void;
  onLocaleChange: (locale: string) => void;
};

export function CustomerMenuList({
  storeName,
  coverImageKey,
  tableName,
  acceptingPublicRequests,
  categories,
  currency,
  availableLocales,
  resolvedLocale,
  svcBusy,
  svcMsg,
  onSendService,
  onPickItem,
  onLocaleChange,
}: CustomerMenuListProps) {
  const t = useTranslations('customer');

  return (
    <div className="min-h-dvh">
      <CustomerMenuCover coverImageKey={coverImageKey} />
      <header className="sticky top-0 z-10 border-b border-border bg-paper-50/95 px-4 py-4 backdrop-blur">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-600">{storeName}</p>
            <h1 className="text-xl font-extrabold text-ink-900">
              {tableName ? t('tableLabel', { name: tableName }) : t('menu')}
            </h1>
          </div>
          <CustomerLanguageSelect
            availableLocales={availableLocales}
            resolvedLocale={resolvedLocale}
            onChange={onLocaleChange}
          />
        </div>
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
        <CustomerMenuCategories
          categories={categories}
          currency={currency}
          acceptingPublicRequests={acceptingPublicRequests}
          onPickItem={onPickItem}
        />
      )}
    </div>
  );
}
