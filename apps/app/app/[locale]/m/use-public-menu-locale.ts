'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

/** 顾客菜单语言存在查询参数 locale 里，与界面语言（cookie / next-intl）分开 */
export const PUBLIC_MENU_LOCALE_PARAM = 'locale';

export function resolvePreferredMenuLocale(
  selectedLocale: string | null,
  urlLocale: string | null,
  fallbackLocale: string,
): string {
  return selectedLocale || urlLocale || fallbackLocale;
}

type PublicMenuLocaleValue = {
  menuLocale: string;
  changeMenuLocale: (locale: string) => void;
};

const PublicMenuLocaleContext = createContext<PublicMenuLocaleValue | null>(null);

function usePublicMenuLocaleState(fallbackLocale: string): PublicMenuLocaleValue {
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

export function PublicMenuLocaleProvider({
  fallbackLocale,
  children,
}: {
  fallbackLocale: string;
  children: ReactNode;
}) {
  const value = usePublicMenuLocaleState(fallbackLocale);
  return createElement(PublicMenuLocaleContext.Provider, { value }, children);
}

/**
 * 菜单语言以组件状态为准：一点即换，不依赖 useSearchParams 是否跟上。
 * 若在顾客页壳里，与页脚共用同一份选择，避免「Powered by」仍停在界面语言。
 */
export function usePublicMenuLocale(fallbackLocale: string) {
  const ctx = useContext(PublicMenuLocaleContext);
  const local = usePublicMenuLocaleState(fallbackLocale);
  return ctx ?? local;
}

/** 并发的菜单请求只采用最新一次，避免慢响应把已选语言盖回去 */
export function useRequestGeneration() {
  const generationRef = useRef(0);
  return useCallback(() => {
    const generation = ++generationRef.current;
    return () => generation === generationRef.current;
  }, []);
}
