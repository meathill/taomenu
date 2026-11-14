import { getPublicMenuMetadata } from '../../../public-menu-metadata';
import { CustomerPickupMenu } from './customer-pickup-menu';

type PickupMenuPageProps = {
  params: Promise<{ storeSlug: string; pickupToken: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PickupMenuPageProps & { searchParams: Promise<{ locale?: string | string[] }> }) {
  const { storeSlug } = await params;
  return getPublicMenuMetadata({
    storeSlug,
    pageKey: 'pickupMode',
    searchParams,
  });
}

export default async function PickupMenuPage({ params }: PickupMenuPageProps) {
  const { pickupToken } = await params;
  return <CustomerPickupMenu pickupToken={pickupToken} />;
}
