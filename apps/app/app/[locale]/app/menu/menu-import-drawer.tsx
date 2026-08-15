'use client';

import { useTranslations } from 'next-intl';
import { ResponsiveDrawer } from '@/components/responsive-drawer';
import { MenuImportPanel } from './menu-import-panel';

type MenuImportDrawerProps = {
  open: boolean;
  storeId: string;
  baseLocale: string;
  currency: string;
  canUseAi: boolean;
  upgradeHref: string;
  onOpenChange: (open: boolean) => void;
};

export function MenuImportDrawer({
  open,
  storeId,
  baseLocale,
  currency,
  canUseAi,
  upgradeHref,
  onOpenChange,
}: MenuImportDrawerProps) {
  const t = useTranslations('menu');
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={t('photoImport')}
      description={t(canUseAi ? 'importDrawerHint' : 'importProHint')}
    >
      <MenuImportPanel
        storeId={storeId}
        baseLocale={baseLocale}
        currency={currency}
        canUseAi={canUseAi}
      />
      {!canUseAi ? (
        <a
          href={upgradeHref}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-700 px-4 text-sm font-bold text-white"
        >
          {t('viewProPlan')}
        </a>
      ) : null}
    </ResponsiveDrawer>
  );
}
