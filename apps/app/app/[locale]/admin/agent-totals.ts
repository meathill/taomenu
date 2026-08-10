import type { AdminAgentOverviewRow, AgentRevenueByCurrency } from '@taomenu/db';

export type AgentOverviewTotals = {
  totalClicks: number;
  referredUsers: number;
  storeCount: number;
  proStoreCount: number;
  /** 按币种合并，币种码升序；不同币种绝不相加。 */
  revenueByCurrency: AgentRevenueByCurrency[];
};

/** admin 首页合计行。多币种各自成列，避免把 VND 和 USD 加到一起。 */
export function sumAgentOverview(rows: readonly AdminAgentOverviewRow[]): AgentOverviewTotals {
  const revenue = new Map<string, AgentRevenueByCurrency>();
  const totals: AgentOverviewTotals = {
    totalClicks: 0,
    referredUsers: 0,
    storeCount: 0,
    proStoreCount: 0,
    revenueByCurrency: [],
  };

  for (const row of rows) {
    totals.totalClicks += row.totalClicks;
    totals.referredUsers += row.referredUsers;
    totals.storeCount += row.storeCount;
    totals.proStoreCount += row.proStoreCount;

    for (const item of row.revenueByCurrency) {
      const current = revenue.get(item.currency);
      if (current) {
        current.totalMinor += item.totalMinor;
        current.count += item.count;
      } else {
        revenue.set(item.currency, { ...item });
      }
    }
  }

  totals.revenueByCurrency = [...revenue.values()].sort((a, b) =>
    a.currency.localeCompare(b.currency),
  );
  return totals;
}
