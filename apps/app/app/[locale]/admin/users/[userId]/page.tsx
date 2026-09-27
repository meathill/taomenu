import { getAdminUserDetail } from '@taomenu/db';
import { formatCurrency } from '@taomenu/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type UserDetailPageProps = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata() {
  const t = await getTranslations('admin');
  return { title: t('userDetail') };
}

const CELL = 'px-3 py-3 align-top';
const NUM_CELL = 'px-3 py-3 align-top text-right tabular-nums';

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value);
}

export default async function AdminUserDetailPage({ params }: UserDetailPageProps) {
  const { userId } = await params;
  const detail = await getAdminUserDetail(getDb(), userId);
  if (!detail) {
    notFound();
  }

  const [t, locale] = await Promise.all([getTranslations('admin'), getLocale()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/users" className="text-sm font-bold text-jade-600 hover:underline">
          {t('backToUsers')}
        </Link>
        <h2 className="text-xl font-black text-ink-900">{detail.email}</h2>
        <p className="text-sm text-muted-foreground">
          {detail.name} · {t('colRegistered')}: {formatDate(detail.createdAt, locale)} ·{' '}
          {t('colLogins')}: {detail.totalLogins} · {t('colLastActive')}:{' '}
          {detail.lastActiveAt ? formatDate(detail.lastActiveAt, locale) : t('never')}
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-ink-900">{t('userStores')}</h3>
        {detail.stores.length === 0 ? (
          <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
            {t('emptyStoreDirectory')}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-paper-50 text-xs font-bold text-muted-foreground">
                <tr>
                  <th className={`${CELL} text-left`}>{t('colStore')}</th>
                  <th className={`${CELL} text-left`}>{t('colPlan')}</th>
                  <th className={`${CELL} text-left`}>{t('colStatus')}</th>
                  <th className={NUM_CELL}>{t('colOrders')}</th>
                  <th className={NUM_CELL}>{t('colGmv')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detail.stores.map((store) => (
                  <tr key={store.id}>
                    <td className={`${CELL} text-left`}>
                      <span className="font-bold text-ink-900">{store.name}</span>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{store.slug}</p>
                    </td>
                    <td className={CELL}>{store.plan}</td>
                    <td className={CELL}>
                      {store.isActive ? t('statusActive') : t('statusDisabled')}
                    </td>
                    <td className={NUM_CELL}>{store.orderCount}</td>
                    <td className={NUM_CELL}>
                      {formatCurrency(store.gmvMinor, store.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
