import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { CustomerPickupMenu } from './customer-pickup-menu';

type PickupMenuPageProps = {
  params: Promise<{ storeSlug: string; pickupToken: string }>;
};

export async function generateMetadata({ params }: PickupMenuPageProps) {
  const { storeSlug } = await params;
  const t = await getTranslations('customer');
  return {
    title: `${t('pickupMode')} · ${storeSlug}`,
    robots: { index: false, follow: false },
  };
}

export default async function PickupMenuPage({ params }: PickupMenuPageProps) {
  const { pickupToken } = await params;
  return (
    <PageMessages namespaces={['customer']}>
      <CustomerPickupMenu pickupToken={pickupToken} />
    </PageMessages>
  );
}
