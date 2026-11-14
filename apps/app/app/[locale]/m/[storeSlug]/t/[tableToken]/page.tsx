import { getPublicMenuMetadata } from '../../../public-menu-metadata';
import { CustomerMenu } from './customer-menu';

type TableMenuPageProps = {
  params: Promise<{ storeSlug: string; tableToken: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: TableMenuPageProps & { searchParams: Promise<{ locale?: string | string[] }> }) {
  const { storeSlug } = await params;
  return getPublicMenuMetadata({
    storeSlug,
    pageKey: 'menu',
    searchParams,
  });
}

export default async function TableMenuPage({ params }: TableMenuPageProps) {
  const { tableToken } = await params;
  return <CustomerMenu tableToken={tableToken} />;
}
