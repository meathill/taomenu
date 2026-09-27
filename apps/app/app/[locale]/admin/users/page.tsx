import { ADMIN_PAGE_SIZE, listAdminUsers, resolveAdminPage } from '@taomenu/db';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/db';
import { Pagination } from '../_components/pagination';
import { SearchForm } from '../_components/search-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('admin');
  return { title: t('usersTitle') };
}

type UsersPageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

const CELL = 'px-3 py-3 align-top';
const NUM_CELL = 'px-3 py-3 align-top text-right tabular-nums';

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value);
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const t = await getTranslations('admin');
  const locale = await getLocale();
  const query = (params.q ?? '').trim();
  const page = resolveAdminPage(params.page);

  const list = await listAdminUsers(getDb(), { query, page });
  const pages = Math.max(1, Math.ceil(list.total / ADMIN_PAGE_SIZE));

  return (
    <div className="space-y-4">
      <SearchForm
        base="/admin/users"
        defaultValue={query}
        labels={{ placeholder: t('searchPlaceholder'), submit: t('search') }}
      />

      {list.rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
          {t('emptyUsers')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-paper-50 text-xs font-bold text-muted-foreground">
              <tr>
                <th className={`${CELL} text-left`}>{t('colEmail')}</th>
                <th className={`${CELL} text-left`}>{t('colRegistered')}</th>
                <th className={NUM_CELL}>{t('colStores')}</th>
                <th className={NUM_CELL}>{t('colLogins')}</th>
                <th className={`${CELL} text-left`}>{t('colLastActive')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.rows.map((row) => (
                <tr key={row.id}>
                  <td className={`${CELL} text-left`}>
                    <Link
                      href={`/admin/users/${row.id}`}
                      className="font-bold text-jade-600 hover:underline"
                    >
                      {row.email}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{row.name}</p>
                  </td>
                  <td className={CELL}>{formatDate(row.createdAt, locale)}</td>
                  <td className={NUM_CELL}>
                    {row.storeCount}
                    {row.proStoreCount > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {' '}
                        (Pro {row.proStoreCount})
                      </span>
                    ) : null}
                  </td>
                  <td className={NUM_CELL}>{row.loginCount}</td>
                  <td className={CELL}>
                    {row.lastActiveAt ? formatDate(row.lastActiveAt, locale) : t('never')}
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
        base="/admin/users"
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
