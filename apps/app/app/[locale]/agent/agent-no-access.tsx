import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

type AgentNoAccessProps = {
  /** 当前登录邮箱，直接显示出来，方便对方判断是不是登错了账号 */
  email: string;
  supportEmail: string;
};

/**
 * 已登录但不是代理商时的提示页。
 * 刻意不用 notFound()：代理商后台的链接是我们主动发给合作伙伴的，
 * 对方登错邮箱时看到 404 只会一头雾水，说清楚原因和联系方式更有用。
 */
export async function AgentNoAccess({ email, supportEmail }: AgentNoAccessProps) {
  const t = await getTranslations('agent');

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-border bg-white p-8">
        <h1 className="text-xl font-black text-ink-900">{t('noAccessTitle')}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t('noAccessBody', { email })}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('noAccessContact')}{' '}
          <a href={`mailto:${supportEmail}`} className="font-bold text-jade-600 hover:underline">
            {supportEmail}
          </a>
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-bold text-ink-900"
        >
          {t('backToApp')}
        </Link>
      </div>
    </div>
  );
}
