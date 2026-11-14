'use client';

import { useEffect } from 'react';
import { buildCustomerDocumentTitle } from './customer-document-title';

/** 顾客菜单语言切换后同步浏览器标题（metadata 不会随客户端 ?locale= 立刻更新） */
export function useCustomerDocumentTitle(pageLabel: string, storeName: string | undefined) {
  useEffect(() => {
    if (!storeName) return;
    const next = buildCustomerDocumentTitle(pageLabel, storeName);
    const previous = document.title;
    document.title = next;
    return () => {
      document.title = previous;
    };
  }, [pageLabel, storeName]);
}
