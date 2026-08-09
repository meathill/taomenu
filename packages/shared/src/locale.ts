/** 产品 UI / 营销站 locale（菜单内容语言另见门店 baseLocale，可任意 BCP-47 短码）。 */

export const LOCALES = ['en', 'zh', 'ja', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  vi: 'Tiếng Việt',
};

/** Cloudflare / ISO 3166-1 alpha-2 → UI locale（仅在浏览器语言未命中时使用） */
export const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  VN: 'vi',
  JP: 'ja',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  MO: 'zh',
};

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && (LOCALES as readonly string[]).includes(value));
}

export function getPrimaryLanguage(locale: string): string {
  try {
    return new Intl.Locale(locale).language.toLowerCase();
  } catch {
    return (locale.trim().split(/[-_]/)[0] ?? locale).toLowerCase();
  }
}

export function doLocalesShareLanguage(first: string, second: string): boolean {
  return getPrimaryLanguage(first) === getPrimaryLanguage(second);
}

/**
 * 解析 Accept-Language，返回第一个支持的 locale。
 * 支持 en-US → en、zh-CN / zh-Hans → zh、ja-JP → ja 等。
 */
export function matchLocaleFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header || header.trim() === '') {
    return null;
  }

  const tags = header
    .split(',')
    .map((part) => {
      const [rawTag, rawQ] = part.trim().split(';');
      const tag = (rawTag ?? '').trim().toLowerCase();
      let q = 1;
      if (rawQ) {
        const match = /q\s*=\s*([0-9.]+)/i.exec(rawQ);
        if (match?.[1]) {
          q = Number(match[1]);
        }
      }
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((item) => item.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    if (isLocale(tag)) {
      return tag;
    }
    const primary = tag.split('-')[0] ?? '';
    if (isLocale(primary)) {
      return primary;
    }
    // zh-hans / zh-hant → zh
    if (primary === 'zh' && isLocale('zh')) {
      return 'zh';
    }
  }

  return null;
}

export function matchLocaleFromCountry(country: string | null | undefined): Locale | null {
  if (!country) {
    return null;
  }
  const code = country.trim().toUpperCase();
  return COUNTRY_TO_LOCALE[code] ?? null;
}

/**
 * 协商 UI locale。
 * 优先级：显式（cookie/path 由调用方处理）→ Accept-Language → IP 国家 → 默认 en。
 */
export function resolveUiLocale(input: {
  acceptLanguage?: string | null;
  country?: string | null;
  preferred?: string | null;
}): Locale {
  if (isLocale(input.preferred ?? undefined)) {
    return input.preferred as Locale;
  }
  const fromBrowser = matchLocaleFromAcceptLanguage(input.acceptLanguage);
  if (fromBrowser) {
    return fromBrowser;
  }
  const fromCountry = matchLocaleFromCountry(input.country);
  if (fromCountry) {
    return fromCountry;
  }
  return DEFAULT_LOCALE;
}
