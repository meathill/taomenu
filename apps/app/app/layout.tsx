import type { ReactNode } from 'react';

/**
 * next-intl 会把请求 rewrite 到 /[locale]/…；
 * html/body 放在 app/[locale]/layout.tsx。
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
