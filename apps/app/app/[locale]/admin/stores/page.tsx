import { ADMIN_PAGE_SIZE, listAdminStores, resolveAdminPage } from '@taomenu/db';
import { formatCurrency } from '@taomenu/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/db';
import { Pagination } from '../_components/pagination';
import { SearchForm } from '../_components/search-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('admin');
  return { title: t('navStores') };
}

type StoresPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

const CELL = 'px-3 py-3 align-top';
const NUM_CELL = 'px-3 py-3 align-top text-right tabular-nums';

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value);
}

export default async function AdminStoresPage({ searchParams }: StoresPageProps) {
  const params = await searchParams;
  const t = await getTranslations('admin');
  const locale = await getLocale();
  const query = (params.q ?? '').trim();
  const page = resolveAdminPage(params.page);

  const list = await listAdminStores(getDb(), { query, page });
  const pages = Math.max(1, Math.ceil(list.total / ADMIN_PAGE_SIZE));

  return (
    <div className="space-y-4">
      <SearchForm
        base="/admin/stores"
        defaultValue={query}
        labels={{ placeholder: t('searchPlaceholder'), submit: t('search') }}
      />

      {list.rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
          {t('emptyStoreDirectory')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="bg-paper-50 text-xs font-bold text-muted-foreground">
              <tr>
                <th className={`${CELL} text-left`}>{t('colStore')}</th>
                <th className={`${CELL} text-left`}>{t('colOwner')}</th>
                <th className={`${CELL} text-left`}>{t('colPlan')}</th>
                <th className={`${CELL} text-left`}>{t('colStatus')}</th>
                <th className={NUM_CELL}>{t('colOrders')}</th>
                <th className={NUM_CELL}>{t('colGmv')}</th>
                <th className={`${CELL} text-left`}>{t('colLastOrder')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.rows.map((row) => (
                <tr key={row.id}>
                  <td className={`${CELL} text-left`}>
                    <span className="font-bold text-ink-900">{row.name}</span>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{row.slug}</p>
                  </td>
                  <td className={`${CELL} max-w-48 break-words text-left text-xs`}>
                    {row.owners.length > 0 ? row.owners.join(', ') : '—'}
                  </td>
                  <td className={CELL}>{row.plan}</td>
                  <td className={CELL}>{row.isActive ? t('statusActive') : t('statusDisabled')}</td>
                  <td className={NUM_CELL}>{row.orderCount}</td>
                  <td className={NUM_CELL}>{formatCurrency(row.gmvMinor, row.currency, locale)}</td>
                  <td className={CELL}>
                    {row.lastOrderAt ? formatDate(row.lastOrderAt, locale) : t('never')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={list.page}
        total={list.total}
        pageSize={ADMIN_PAGE_SIZE}
        base="/admin/stores"
        params={{ q: query || undefined }}
        labels={{
          info: t('pageInfo', { page: list.page, pages, total: list.total }),
          prev: t('prev'),
          next: t('next'),
        }}
      />
    </div>
  );
}
