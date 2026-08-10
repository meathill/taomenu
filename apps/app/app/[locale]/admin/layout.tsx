import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { PageMessages } from '@/components/page-messages';
import { requireAdmin } from '@/lib/admin';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

type AdminLayoutProps = {
  children: ReactNode;
};

/**
 * /admin 唯一的鉴权入口：未登录跳登录，已登录但不是 root 一律 notFound()，
 * 不用 403——不向普通用户暴露 admin 后台的存在。
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const admin = await requireAdmin();
  if (!admin) {
    const session = await getSession();
    if (!session?.user) {
      redirect('/login?next=/admin');
    }
    notFound();
  }

  const t = await getTranslations('admin');

  return (
    <PageMessages namespaces={['admin']}>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <header className="flex flex-col gap-2 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-ink-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
          <Link href="/app" className="text-sm font-bold text-jade-600 hover:underline">
            {t('backToApp')}
          </Link>
        </header>
        {children}
      </div>
    </PageMessages>
  );
}
