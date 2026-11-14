import { APP_NAME } from '@taomenu/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PageMessages } from '@/components/page-messages';
import { Skeleton } from '@/components/ui/skeleton';
import { isSignupIntent } from '@/lib/login-intent';
import { getHelpUrl } from '@/lib/public-url';
import { LoginForm } from './login-form';

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: LoginPageProps) {
  const t = await getTranslations('login');
  const isSignup = isSignupIntent((await searchParams).intent);
  return { title: t(isSignup ? 'signupTitle' : 'title') };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations('login');
  const locale = await getLocale();
  // 从「免费开始」进来的新商家：明确告诉他首次登录即创建账号（issue #24）
  const isSignup = isSignupIntent((await searchParams).intent);

  return (
    <PageMessages namespaces={['login']}>
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <p className="text-sm font-bold tracking-wide text-jade-600 uppercase">{APP_NAME}</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink-900">
          {t(isSignup ? 'signupTitle' : 'title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t(isSignup ? 'signupSubtitle' : 'subtitle')}
        </p>
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
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('needHelp')}{' '}
          <a href={getHelpUrl(locale)} className="font-semibold text-jade-700 underline">
            {t('contactUs')}
          </a>
        </p>
      </div>
    </PageMessages>
  );
}
