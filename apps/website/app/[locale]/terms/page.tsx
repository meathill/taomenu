import { DocPage, docMetadata, docStaticParams } from '@/components/doc-page';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return docStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return docMetadata('terms', locale);
}

export default function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  return <DocPage slug="terms" params={params} />;
}
