import { APP_NAME } from '@taomenu/shared';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageMessages } from '@/components/page-messages';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginForm } from './login-form';

export async function generateMetadata() {
  const t = await getTranslations('login');
  return { title: t('title') };
}

export default async function LoginPage() {
  const t = await getTranslations('login');

  return (
    <PageMessages namespaces={['login']}>
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <p className="text-sm font-bold tracking-wide text-jade-600 uppercase">{APP_NAME}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink-900">{t('title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>
        <div className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <Suspense
            fallback={
              <div className="space-y-3" aria-busy="true" aria-label={t('loading')} role="status">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </PageMessages>
  );
}
