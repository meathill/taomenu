import { getAgentById, getAgentStats } from '@taomenu/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { AgentPromoLinks } from '@/components/agent-promo-links';
import { AgentStatsView } from '@/components/agent-stats-view';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type AgentDetailPageProps = {
  params: Promise<{ agentId: string }>;
};

export async function generateMetadata() {
  const t = await getTranslations('admin');
  return { title: t('detail') };
}

export default async function AdminAgentDetailPage({ params }: AgentDetailPageProps) {
  const { agentId } = await params;
  const db = getDb();
  const agent = await getAgentById(db, agentId);
  if (!agent) {
    notFound();
  }

  const [t, locale, stats] = await Promise.all([
    getTranslations('admin'),
    getLocale(),
    getAgentStats(db, agent.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin" className="text-sm font-bold text-jade-600 hover:underline">
          {t('backToAgents')}
        </Link>
        <h2 className="text-xl font-black text-ink-900">{agent.name}</h2>
        <p className="text-sm text-muted-foreground">
          {agent.email} · <span className="font-mono">{agent.code}</span> ·{' '}
          {agent.status === 'active' ? t('statusActive') : t('statusDisabled')}
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-ink-900">{t('linksTitle')}</h3>
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
          storeOwner: t('storeOwner'),
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
