'use client';

import { useTranslations } from 'next-intl';
import { ResponsiveDrawer } from '@/components/responsive-drawer';
import { MenuImportPanel } from './menu-import-panel';

type MenuImportDrawerProps = {
  open: boolean;
  storeId: string;
  baseLocale: string;
  currency: string;
  /** Free 也能用照片/PDF 导入（每月少量次数，issue #25），这里只决定文案与升级提示 */
  isPro: boolean;
  upgradeHref: string;
  onOpenChange: (open: boolean) => void;
};

export function MenuImportDrawer({
  open,
  storeId,
  baseLocale,
  currency,
  isPro,
  upgradeHref,
  onOpenChange,
}: MenuImportDrawerProps) {
  const t = useTranslations('menu');
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
      />
      {!isPro ? (
        <p className="mt-4 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs leading-5 text-muted-foreground">
          {t('importFreeUpsell')}{' '}
          <a href={upgradeHref} className="font-bold text-indigo-700">
            {t('viewProPlan')}
          </a>
        </p>
      ) : null}
    </ResponsiveDrawer>
  );
}
