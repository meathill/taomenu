'use client';

import { useLinkStatus } from 'next/link';
import { Spinner } from '@/components/spinner';

/**
 * 链接级导航反馈：作为 <Link> 的子组件使用，
 * 客户端导航进行中时显示 spinner（基于 useLinkStatus，点击瞬间即触发）。
 */
export function NavigationSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Spinner className={className} />;
}
