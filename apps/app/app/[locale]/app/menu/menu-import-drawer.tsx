'use client';

import { useTranslations } from 'next-intl';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { ResponsiveDrawer } from '@/components/responsive-drawer';
import { MenuImportPanel } from './menu-import-panel';

type MenuImportDrawerProps = {
  open: boolean;
  storeId: string;
  baseLocale: string;
  currency: string;
  /** Free 也能用照片/PDF 导入（每月少量次数，issue #25），这里只决定文案与升级提示 */
  isPro: boolean;
  /** 套餐语言名额还够把识别原文存成额外语言时为 true */
  canKeepImportOriginal: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MenuImportDrawer({
  open,
  storeId,
  baseLocale,
  currency,
  isPro,
  canKeepImportOriginal,
  onOpenChange,
}: MenuImportDrawerProps) {
  const t = useTranslations('menu');
  const { openPaywall } = usePaywall();
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={t('photoImport')}
      description={t('importDrawerHint')}
    >
      <MenuImportPanel
        storeId={storeId}
        baseLocale={baseLocale}
        currency={currency}
        isPro={isPro}
        canKeepImportOriginal={canKeepImportOriginal}
      />
      {!isPro ? (
        <p className="mt-4 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs leading-5 text-muted-foreground">
          {t('importFreeUpsell')}{' '}
          <button
            type="button"
            onClick={() => openPaywall('menuImport')}
            className="font-bold text-violet-700"
          >
            {t('viewProPlan')}
          </button>
        </p>
      ) : null}
    </ResponsiveDrawer>
  );
}
