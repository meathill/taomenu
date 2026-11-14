'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * 顾客点单页的「Powered by TaoMenu」由根布局的 SiteFooter 渲染，但是否显示取决于
 * 页面里客户端拉到的菜单（store.showPoweredBy，issue #26）。用一个极小的外部 store 传递：
 * - null：菜单还没加载，先不渲染，避免 Pro 商家的页面闪一下水印
 * - true / false：按服务端结论显示或隐藏
 */
type Visibility = boolean | null;

let visibility: Visibility = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Visibility {
  return visibility;
}

function getServerSnapshot(): Visibility {
  return null;
}

export function setPoweredByVisibility(next: Visibility) {
  if (visibility === next) return;
  visibility = next;
  for (const listener of listeners) listener();
}

export function usePoweredByVisibility(): Visibility {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 未加载时先不显示；老接口没有该字段时按显示处理 */
export function resolvePoweredByVisibility(
  showPoweredBy: boolean | undefined,
  loaded: boolean,
): Visibility {
  if (!loaded) return null;
  return showPoweredBy !== false;
}

/** 顾客菜单组件调用；离开页面时复位 */
export function useSyncPoweredByVisibility(showPoweredBy: boolean | undefined, loaded: boolean) {
  const next = resolvePoweredByVisibility(showPoweredBy, loaded);
  useEffect(() => {
    setPoweredByVisibility(next);
  }, [next]);
  useEffect(() => () => setPoweredByVisibility(null), []);
}
