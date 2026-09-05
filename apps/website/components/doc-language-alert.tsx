import { DEFAULT_LOCALE } from '@taomenu/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import type { DocSlug } from '@/lib/docs';

type DocLanguageAlertProps = {
  locale: string;
  slug: DocSlug;
};

/** 非英文文档：提示以英文版为准 */
export async function DocLanguageAlert({ locale, slug }: DocLanguageAlertProps) {
  if (locale === DEFAULT_LOCALE) {
    return null;
  }

  const t = await getTranslations('docs');

  return (
    <aside
      className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
      role="status"
    >
      <p className="font-semibold">{t('englishAuthoritativeTitle')}</p>
      <p className="mt-1">{t('englishAuthoritativeBody')}</p>
      <p className="mt-2">
        <Link
          href={`/${slug}`}
          locale={DEFAULT_LOCALE}
          prefetch={false}
          className="font-bold text-brand-700 underline-offset-2 hover:underline"
        >
          {t('viewEnglish')}
        </Link>
      </p>
    </aside>
  );
}
