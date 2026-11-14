import { getTranslations } from 'next-intl/server';
import { CustomerMenu } from './customer-menu';

type TableMenuPageProps = {
  params: Promise<{ storeSlug: string; tableToken: string }>;
};

export async function generateMetadata({ params }: TableMenuPageProps) {
  const { storeSlug } = await params;
  const t = await getTranslations('customer');
  return {
    title: `${t('menu')} · ${storeSlug}`,
    robots: { index: false, follow: false },
  };
}

export default async function TableMenuPage({ params }: TableMenuPageProps) {
  const { tableToken } = await params;
  return <CustomerMenu tableToken={tableToken} />;
}
