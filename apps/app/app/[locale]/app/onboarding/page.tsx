import { APP_NAME } from '@taomenu/shared';
import { getTranslations } from 'next-intl/server';
import { OnboardingForm } from './onboarding-form';

export async function generateMetadata() {
  const t = await getTranslations('onboarding');
  return { title: t('title') };
}

export default async function OnboardingPage() {
  const t = await getTranslations('onboarding');

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-sm font-semibold text-jade-600">{APP_NAME}</p>
      <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
      <div className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <OnboardingForm />
      </div>
    </div>
  );
}
