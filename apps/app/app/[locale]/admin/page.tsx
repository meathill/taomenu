import { type AgentRevenueByCurrency, getAdminAgentOverview } from '@taomenu/db';
import { formatCurrency } from '@taomenu/shared';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/db';
import { AgentCreateForm } from './agent-create-form';
import { AgentStatusToggle } from './agent-status-toggle';
import { sumAgentOverview } from './agent-totals';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('admin');
  return { title: t('title') };
}

const CELL = 'px-3 py-3 align-top';
const NUM_CELL = 'px-3 py-3 align-top text-right tabular-nums';

function formatRevenue(items: readonly AgentRevenueByCurrency[], locale: string): string {
  if (items.length === 0) {
    return '—';
  }
  return items.map((item) => formatCurrency(item.totalMinor, item.currency, locale)).join(' · ');
}

export default async function AdminAgentsPage() {
  const t = await getTranslations('admin');
  const locale = await getLocale();
  const rows = await getAdminAgentOverview(getDb());
  const totals = sumAgentOverview(rows);

  return (
    <div className="space-y-5">
      <AgentCreateForm />

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-ink-900">{t('agents')}</h2>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
            {t('emptyAgents')}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-paper-50 text-xs font-bold text-muted-foreground">
                <tr>
                  <th className={`${CELL} text-left`}>{t('colName')}</th>
                  <th className={`${CELL} text-left`}>{t('colCode')}</th>
                  <th className={`${CELL} text-left`}>{t('colStatus')}</th>
                  <th className={NUM_CELL}>{t('colClicks')}</th>
                  <th className={NUM_CELL}>{t('colUsers')}</th>
                  <th className={NUM_CELL}>{t('colStores')}</th>
                  <th className={NUM_CELL}>{t('colPro')}</th>
                  <th className={NUM_CELL}>{t('colRevenue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className={`${CELL} text-left`}>
                      <Link
                        href={`/admin/agents/${row.id}`}
                        className="font-bold text-jade-600 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">{row.email}</p>
                    </td>
                    <td className={`${CELL} font-mono text-xs text-ink-900`}>{row.code}</td>
                    <td className={CELL}>
                      <AgentStatusToggle agentId={row.id} status={row.status} />
                    </td>
                    <td className={NUM_CELL}>{row.totalClicks}</td>
                    <td className={NUM_CELL}>{row.referredUsers}</td>
                    <td className={NUM_CELL}>{row.storeCount}</td>
                    <td className={NUM_CELL}>{row.proStoreCount}</td>
                    <td className={NUM_CELL}>{formatRevenue(row.revenueByCurrency, locale)}</td>
                  </tr>
                ))}
                <tr className="bg-paper-50 font-bold text-ink-900">
                  <td className={`${CELL} text-left`} colSpan={3}>
                    {t('totals')}
                  </td>
                  <td className={NUM_CELL}>{totals.totalClicks}</td>
                  <td className={NUM_CELL}>{totals.referredUsers}</td>
                  <td className={NUM_CELL}>{totals.storeCount}</td>
                  <td className={NUM_CELL}>{totals.proStoreCount}</td>
                  <td className={NUM_CELL}>{formatRevenue(totals.revenueByCurrency, locale)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
