'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

/** 顾客菜单语言存在查询参数 locale 里，与界面语言（cookie / next-intl）分开 */
export const PUBLIC_MENU_LOCALE_PARAM = 'locale';

export function resolvePreferredMenuLocale(
  selectedLocale: string | null,
  urlLocale: string | null,
  fallbackLocale: string,
): string {
  return selectedLocale || urlLocale || fallbackLocale;
}

/**
 * 菜单语言以组件状态为准：一点即换，不依赖 useSearchParams 是否跟上。
 * 轮询 / 切回前台时也用这份选择，避免旧请求把语言打回基础语言。
 */
export function usePublicMenuLocale(fallbackLocale: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlLocale = searchParams.get(PUBLIC_MENU_LOCALE_PARAM);
  const [selectedLocale, setSelectedLocale] = useState<string | null>(urlLocale);
  const menuLocale = resolvePreferredMenuLocale(selectedLocale, urlLocale, fallbackLocale);

  const changeMenuLocale = useCallback(
    (nextLocale: string) => {
      setSelectedLocale(nextLocale);
      const params = new URLSearchParams(searchParams.toString());
      params.set(PUBLIC_MENU_LOCALE_PARAM, nextLocale);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { menuLocale, changeMenuLocale };
}

/** 并发的菜单请求只采用最新一次，避免慢响应把已选语言盖回去 */
export function useRequestGeneration() {
  const generationRef = useRef(0);
  return useCallback(() => {
    const generation = ++generationRef.current;
    return () => generation === generationRef.current;
  }, []);
}
