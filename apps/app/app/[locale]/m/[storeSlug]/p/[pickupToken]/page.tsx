import { CustomerPickupMenu } from './customer-pickup-menu';

type PickupMenuPageProps = {
  params: Promise<{ storeSlug: string; pickupToken: string }>;
};

export async function generateMetadata({ params }: PickupMenuPageProps) {
  const { storeSlug } = await params;
  return {
    title: `Lấy món · ${storeSlug}`,
    robots: { index: false, follow: false },
  };
}

export default async function PickupMenuPage({ params }: PickupMenuPageProps) {
  const { pickupToken } = await params;
  return <CustomerPickupMenu pickupToken={pickupToken} />;
}
