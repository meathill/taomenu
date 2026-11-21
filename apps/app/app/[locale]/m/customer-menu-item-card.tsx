'use client';

import { formatListedPrice } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { publicMediaPath } from '@/lib/menu-image';
import type { PublicMenuItem } from './modifier-picker';

type CustomerMenuItemCardProps = {
  item: PublicMenuItem;
  currency: string;
  disabled: boolean;
  onOpenDetail: () => void;
  onQuickAdd: () => void;
};

/** 顾客菜单菜品卡片：点照片/名称/简介打开详情；“+” 是独立的加入按钮 */
export function CustomerMenuItemCard({
  item,
  currency,
  disabled,
  onOpenDetail,
  onQuickAdd,
}: CustomerMenuItemCardProps) {
  const t = useTranslations('customer');
  const locale = useLocale();
  const description = item.description?.trim() || null;

  return (
    <div className="flex w-full min-w-0 items-stretch rounded-2xl border border-border bg-white">
      <button
        type="button"
        disabled={disabled}
        onClick={onOpenDetail}
        className="flex min-w-0 flex-1 items-stretch gap-3 p-3.5 text-left disabled:opacity-50"
      >
        {item.imageKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicMediaPath(item.imageKey)}
            alt=""
            className="size-20 shrink-0 rounded-2xl object-cover"
            loading="lazy"
          />
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <span className="block text-base font-semibold leading-snug text-ink-900 wrap-anywhere">
            {item.name}
          </span>
          {description ? (
            <span className="line-clamp-3 text-sm leading-snug text-muted-foreground wrap-anywhere">
              {description}
            </span>
          ) : null}
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatListedPrice(item.priceAmount, currency, locale, t('askStaff'))}
            {item.isSoldOut ? ` · ${t('soldOut')}` : ''}
            {(item.modifierGroups?.length ?? 0) > 0 ? ` · ${t('options')}` : ''}
          </span>
        </span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onQuickAdd}
        aria-label={t('quickAdd', { name: item.name })}
        className="flex size-11 shrink-0 items-center justify-center self-center mr-2 text-xl font-bold leading-none text-brand-600 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
