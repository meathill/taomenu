import type { AgentRevenueKind, AgentStats } from '@taomenu/db';
import { formatCurrency } from '@taomenu/shared';
import { AgentStatCards } from '@/components/agent-stat-cards';

/**
 * 一个代理商的完整统计视图（服务端组件）：统计卡片 + 归因店铺明细 + 收入流水。
 * admin 后台与代理商后台共用，因此文案全部由调用方按各自的 i18n namespace 传入。
 */
export type AgentStatsLabels = {
  statClicks: string;
  statUsers: string;
  statStores: string;
  statPro: string;
  storesTitle: string;
  storeName: string;
  /**
   * 店主邮箱列的表头。**只有传了才渲染这一列**——代理商侧不传，
   * 商家邮箱属于隐私，代理商只需要看到店名 / 套餐 / 注册时间。
   */
  storeOwner?: string;
  storePlan: string;
  storeCreated: string;
  emptyStores: string;
  revenueTitle: string;
  emptyRevenue: string;
  revenueInvoices: (count: number) => string;
  eventStore: string;
  eventKind: string;
  eventAmount: string;
  eventDate: string;
  kindProPlan: string;
  kindStaffSeats: string;
  kindUnknown: string;
};

type AgentStatsViewProps = {
  stats: AgentStats;
  locale: string;
  labels: AgentStatsLabels;
};

const CELL = 'px-3 py-3 align-top';
const NUM_CELL = 'px-3 py-3 align-top text-right tabular-nums';

/** 统计口径本身按 UTC 聚合，展示也统一用 UTC，省掉时区口径的扯皮。 */
function formatUtc(date: Date): string {
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

function formatKind(kind: AgentRevenueKind, labels: AgentStatsLabels): string {
  if (kind === 'pro_plan') return labels.kindProPlan;
  if (kind === 'staff_seats') return labels.kindStaffSeats;
  return labels.kindUnknown;
}

export function AgentStatsView({ stats, locale, labels }: AgentStatsViewProps) {
  const storeNameById = new Map(stats.stores.map((store) => [store.storeId, store.name]));
  const showOwner = Boolean(labels.storeOwner);

  return (
    <>
      <AgentStatCards
        items={[
          { label: labels.statClicks, value: stats.totalClicks },
          { label: labels.statUsers, value: stats.referredUsers },
          { label: labels.statStores, value: stats.stores.length },
          { label: labels.statPro, value: stats.proStoreCount },
        ]}
      />

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-ink-900">{labels.storesTitle}</h3>
        {stats.stores.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
            {labels.emptyStores}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-paper-50 text-left text-xs font-bold text-muted-foreground">
                <tr>
                  <th className={CELL}>{labels.storeName}</th>
                  {showOwner ? <th className={CELL}>{labels.storeOwner}</th> : null}
                  <th className={CELL}>{labels.storePlan}</th>
                  <th className={CELL}>{labels.storeCreated}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.stores.map((store) => (
                  <tr key={store.storeId}>
                    <td className={`${CELL} font-bold text-ink-900`}>{store.name}</td>
                    {showOwner ? (
                      <td className={`${CELL} text-muted-foreground`}>{store.ownerEmail}</td>
                    ) : null}
                    <td className={CELL}>
                      <span
                        className={
                          store.plan === 'pro'
                            ? 'rounded-full bg-jade-50 px-2.5 py-1 text-xs font-bold text-jade-600'
                            : 'rounded-full bg-paper-50 px-2.5 py-1 text-xs font-bold text-muted-foreground'
                        }
                      >
                        {store.plan}
                      </span>
                    </td>
                    <td className={`${CELL} text-xs text-muted-foreground`}>
                      {formatUtc(store.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-ink-900">{labels.revenueTitle}</h3>
        {stats.revenueByCurrency.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
            {labels.emptyRevenue}
          </p>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.revenueByCurrency.map((item) => (
                <li key={item.currency} className="rounded-2xl border border-border bg-white p-4">
                  <p className="text-lg font-black text-ink-900">
                    {formatCurrency(item.totalMinor, item.currency, locale)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {labels.revenueInvoices(item.count)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="overflow-x-auto rounded-2xl border border-border bg-white">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-paper-50 text-left text-xs font-bold text-muted-foreground">
                  <tr>
                    <th className={CELL}>{labels.eventStore}</th>
                    <th className={CELL}>{labels.eventKind}</th>
                    <th className={NUM_CELL}>{labels.eventAmount}</th>
                    <th className={CELL}>{labels.eventDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.revenueEvents.map((event) => (
                    <tr key={`${event.storeId}-${event.createdAt.getTime()}-${event.amountMinor}`}>
                      <td className={`${CELL} text-ink-900`}>
                        {storeNameById.get(event.storeId) ?? event.storeId}
                      </td>
                      <td className={`${CELL} text-muted-foreground`}>
                        {formatKind(event.kind, labels)}
                      </td>
                      <td className={NUM_CELL}>
                        {formatCurrency(event.amountMinor, event.currency, locale)}
                      </td>
                      <td className={`${CELL} text-xs text-muted-foreground`}>
                        {formatUtc(event.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
