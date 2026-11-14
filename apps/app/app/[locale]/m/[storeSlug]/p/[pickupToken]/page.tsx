import { getTranslations } from 'next-intl/server';
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
  return <CustomerPickupMenu pickupToken={pickupToken} />;
}
