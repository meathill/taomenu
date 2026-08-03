import { DocPage, docMetadata, docStaticParams } from '@/components/doc-page';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return docStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return docMetadata('contact-us', locale);
}

export default function ContactUsPage({ params }: { params: Promise<{ locale: string }> }) {
  return <DocPage slug="contact-us" params={params} />;
}
