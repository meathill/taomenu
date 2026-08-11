import { APP_NAME } from '@taomenu/shared';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Link } from '@/i18n/routing';

export async function SiteFooter() {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');

  const productLinks = [
    { href: '/pricing' as const, label: tNav('pricing') },
    { href: '/about' as const, label: t('about') },
    { href: '/contact-us' as const, label: t('contact') },
  ];

  const externalLinks = [{ href: 'https://firstlook.tools', label: 'First Look' }];

  const legalLinks = [
    { href: '/privacy' as const, label: t('privacy') },
    { href: '/terms' as const, label: t('terms') },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-white">
      <div className="container mx-auto grid gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="text-base font-bold text-ink-900">{APP_NAME}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('tagline')}</p>
        </div>

        <div>
          <p className="text-xs font-bold tracking-wide text-ink-900 uppercase">{t('product')}</p>
          <ul className="mt-3 space-y-2">
            {productLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-semibold text-muted-foreground hover:text-brand-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {externalLinks.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-sm font-semibold text-muted-foreground hover:text-brand-700"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold tracking-wide text-ink-900 uppercase">{t('legal')}</p>
          <ul className="mt-3 space-y-2">
            {legalLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-semibold text-muted-foreground hover:text-brand-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold tracking-wide text-ink-900 uppercase">
            {tNav('language')}
          </p>
          <div className="mt-3">
            <LocaleSwitcher label={tNav('language')} />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP_NAME}
          </p>
          <p>{t('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
