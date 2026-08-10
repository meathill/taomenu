import type { AdminAgentOverviewRow } from '@taomenu/db';
import { describe, expect, it } from 'vitest';
import { sumAgentOverview } from './agent-totals';

function makeRow(overrides: Partial<AdminAgentOverviewRow>): AdminAgentOverviewRow {
  return {
    id: 'a1',
    code: 'ABCD2345',
    name: 'Agent',
    email: 'a@example.com',
    status: 'active',
    createdAt: new Date(0),
    updatedAt: new Date(0),
    totalClicks: 0,
    referredUsers: 0,
    storeCount: 0,
    proStoreCount: 0,
    revenueByCurrency: [],
    ...overrides,
  };
}

describe('sumAgentOverview', () => {
  it('空列表返回全 0', () => {
    expect(sumAgentOverview([])).toEqual({
      totalClicks: 0,
      referredUsers: 0,
      storeCount: 0,
      proStoreCount: 0,
      revenueByCurrency: [],
    });
  });

  it('计数相加，收入按币种分别合并且不跨币种求和', () => {
    const totals = sumAgentOverview([
      makeRow({
        id: 'a1',
        totalClicks: 10,
        referredUsers: 3,
        storeCount: 2,
        proStoreCount: 1,
        revenueByCurrency: [
          { currency: 'VND', totalMinor: 100000, count: 1 },
          { currency: 'USD', totalMinor: 599, count: 1 },
        ],
      }),
      makeRow({
        id: 'a2',
        totalClicks: 5,
        referredUsers: 1,
        storeCount: 1,
        proStoreCount: 0,
        revenueByCurrency: [{ currency: 'VND', totalMinor: 50000, count: 2 }],
      }),
    ]);

    expect(totals.totalClicks).toBe(15);
    expect(totals.referredUsers).toBe(4);
    expect(totals.storeCount).toBe(3);
    expect(totals.proStoreCount).toBe(1);
    expect(totals.revenueByCurrency).toEqual([
      { currency: 'USD', totalMinor: 599, count: 1 },
      { currency: 'VND', totalMinor: 150000, count: 3 },
    ]);
  });

  it('不修改入参里的收入对象', () => {
    const row = makeRow({ revenueByCurrency: [{ currency: 'VND', totalMinor: 100, count: 1 }] });
    sumAgentOverview([
      row,
      makeRow({ revenueByCurrency: [{ currency: 'VND', totalMinor: 100, count: 1 }] }),
    ]);
    expect(row.revenueByCurrency[0]).toEqual({ currency: 'VND', totalMinor: 100, count: 1 });
  });
});
