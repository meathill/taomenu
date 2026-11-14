import { useLocale } from 'next-intl';
import { useMemo } from 'react';

/** 导入提示里用到的语言名称（按界面语言显示） */
export function useImportLanguageNames(
  baseLocale: string,
  detectedLocale: string | null,
  originalLocale: string | null,
) {
  const locale = useLocale();
  return useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: 'language' });
    function nameOf(code: string | null): string {
      return code ? (names.of(code) ?? code) : '';
    }
    return {
      base: nameOf(baseLocale),
      detected: nameOf(detectedLocale),
      original: nameOf(originalLocale),
    };
  }, [baseLocale, detectedLocale, locale, originalLocale]);
}
