import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getTerminalSession } from '@/lib/terminal-session';
import { PairForm } from './pair-form';

export async function generateMetadata() {
  const t = await getTranslations('terminal');
  return { title: t('pairTitle') };
}

export default async function TerminalPairPage() {
  const t = await getTranslations('terminal');
  const terminal = await getTerminalSession();
  if (terminal) redirect('/terminal');

  return (
    <PageMessages namespaces={['terminal']}>
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="text-sm font-bold text-jade-600">TaoMenu</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900">{t('pairTitle')}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('pairSubtitle')}</p>
        <div className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <PairForm />
        </div>
      </div>
    </PageMessages>
  );
}
