import { getAgentStats } from '@taomenu/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { AgentPromoLinks } from '@/components/agent-promo-links';
import { AgentStatsView } from '@/components/agent-stats-view';
import { requireAgent } from '@/lib/agent-session';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { AgentNoAccess } from './agent-no-access';

export const dynamic = 'force-dynamic';

/** 合作伙伴对接邮箱，无权限时引导对方联系我们。 */
const SUPPORT_EMAIL = 'hello@dyqr.me';

export async function generateMetadata() {
  const t = await getTranslations('agent');
  return { title: t('title') };
}

export default async function AgentDashboardPage() {
  const agent = await requireAgent();
  if (!agent) {
    const session = await getSession();
    const email = session?.user?.email;
    if (!email) {
      redirect('/login?next=/agent');
    }
    return <AgentNoAccess email={email} supportEmail={SUPPORT_EMAIL} />;
  }

  const [t, locale, stats] = await Promise.all([
    getTranslations('agent'),
    getLocale(),
    getAgentStats(getDb(), agent.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-2 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink-900">
            {t('welcome', { name: agent.name })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('codeLabel')}: <span className="font-mono font-bold">{agent.code}</span>
          </p>
        </div>
        <Link href="/app" className="text-sm font-bold text-jade-600 hover:underline">
          {t('backToApp')}
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-ink-900">{t('linksTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('linksHint')}</p>
        <AgentPromoLinks
          code={agent.code}
          labels={{
            linkWebsite: t('linkWebsite'),
            linkApp: t('linkApp'),
            qrAlt: t('qrAlt'),
            copy: t('copy'),
            copied: t('copied'),
            download: t('download'),
          }}
        />
      </section>

      <AgentStatsView
        stats={stats}
        locale={locale}
        labels={{
          statClicks: t('statClicks'),
          statUsers: t('statUsers'),
          statStores: t('statStores'),
          statPro: t('statPro'),
          storesTitle: t('storesTitle'),
          storeName: t('storeName'),
          // 刻意不传 storeOwner：商家邮箱属于隐私，代理商侧不展示店主信息
          storePlan: t('storePlan'),
          storeCreated: t('storeCreated'),
          emptyStores: t('emptyStores'),
          revenueTitle: t('revenueTitle'),
          emptyRevenue: t('emptyRevenue'),
          revenueInvoices: (count) => t('revenueInvoices', { count }),
          eventStore: t('eventStore'),
          eventKind: t('eventKind'),
          eventAmount: t('eventAmount'),
          eventDate: t('eventDate'),
          kindProPlan: t('kindProPlan'),
          kindStaffSeats: t('kindStaffSeats'),
          kindUnknown: t('kindUnknown'),
        }}
      />
    </div>
  );
}
