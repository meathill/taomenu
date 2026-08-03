import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
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
  return (
    <PageMessages namespaces={['customer']}>
      <CustomerMenu tableToken={tableToken} />
    </PageMessages>
  );
}
