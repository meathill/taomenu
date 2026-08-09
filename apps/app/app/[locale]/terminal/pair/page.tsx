import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getSession } from '@/lib/session';
import { getTerminalSession } from '@/lib/terminal-session';
import { PairForm } from './pair-form';

export async function generateMetadata() {
  const t = await getTranslations('terminal');
  return { title: t('pairTitle') };
}

type TerminalPairPageProps = {
  searchParams: Promise<{ code?: string | string[] }>;
};

export default async function TerminalPairPage({ searchParams }: TerminalPairPageProps) {
  const t = await getTranslations('terminal');
  const rawCode = (await searchParams).code;
  const code = typeof rawCode === 'string' ? rawCode : (rawCode?.[0] ?? '');
  const nextPath = code ? `/terminal/pair?code=${encodeURIComponent(code)}` : '/terminal/pair';
  const session = await getSession();
  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const terminal = await getTerminalSession(session.user.id);
  if (terminal) redirect('/terminal');

  return (
    <PageMessages namespaces={['terminal']}>
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 text-sm font-bold text-jade-600">
          <Image
            src="/brand/taomenu-mark.svg"
            alt=""
            aria-hidden="true"
            width={28}
            height={28}
            className="size-7 rounded-lg"
          />
          <span>TaoMenu</span>
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900">{t('pairTitle')}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('pairSubtitle')}</p>
        <div className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <PairForm code={code || null} />
        </div>
      </div>
    </PageMessages>
  );
}
