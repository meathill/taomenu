import { DocPage, docMetadata, docStaticParams } from '@/components/doc-page';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return docStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return docMetadata('privacy', locale);
}

export default function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  return <DocPage slug="privacy" params={params} />;
}
