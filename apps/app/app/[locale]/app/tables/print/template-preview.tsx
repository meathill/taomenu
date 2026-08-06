'use client';

import { LockSimpleIcon, XIcon } from '@phosphor-icons/react';
import type { PlanId } from '@taomenu/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { customerEntryUrl } from '../customer-url';
import { QrCard } from '../qr-card';
import { isTemplateAvailable, QR_CARD_TEMPLATES, type QrCardTemplateId } from '../qr-templates';

type TemplatePreviewProps = {
  storeName: string;
  storeSlug: string;
  plan: PlanId;
  scanHint: string;
  qrAlt: string;
  upgradeUrl: string;
  selectedTemplateId: QrCardTemplateId;
  onSelectTemplate: (templateId: QrCardTemplateId) => void;
};

type PreviewFields = {
  storeName: string;
  entryName: string;
  scanHint: string;
};

export function TemplatePreview({
  storeName,
  storeSlug,
  plan,
  scanHint,
  qrAlt,
  upgradeUrl,
  selectedTemplateId,
  onSelectTemplate,
}: TemplatePreviewProps) {
  const t = useTranslations('tables');
  const previewUrl = customerEntryUrl('table', storeSlug, 'preview');
  const [previewTemplateId, setPreviewTemplateId] = useState<QrCardTemplateId | null>(null);
  const [previewFields, setPreviewFields] = useState<PreviewFields>({
    storeName,
    entryName: t('previewEntryDefault'),
    scanHint,
  });

  useEffect(() => {
    if (previewTemplateId === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPreviewTemplateId(null);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewTemplateId]);

  function openPreview(templateId: QrCardTemplateId) {
    setPreviewFields({
      storeName,
      entryName: t('previewEntryDefault'),
      scanHint,
    });
    setPreviewTemplateId(templateId);
  }

  function updatePreviewField(field: keyof PreviewFields, value: string) {
    setPreviewFields((current) => ({ ...current, [field]: value }));
  }

  function chooseTemplate(templateId: QrCardTemplateId) {
    onSelectTemplate(templateId);
    setPreviewTemplateId(null);
  }

  const previewTemplate = previewTemplateId
    ? QR_CARD_TEMPLATES.find((template) => template.id === previewTemplateId)
    : null;
  const previewIsAvailable = previewTemplate ? isTemplateAvailable(previewTemplate, plan) : false;

  return (
    <>
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-ink-900">{t('templateLabel')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('templatePreviewHint')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QR_CARD_TEMPLATES.map((template) => {
            const available = isTemplateAvailable(template, plan);
            const isActive = template.id === selectedTemplateId;
            return (
              <article
                key={template.id}
                className={[
                  'rounded-2xl border bg-white p-2 transition-shadow',
                  isActive ? 'border-jade-600 shadow-md' : 'border-border',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={() => openPreview(template.id)}
                  aria-label={`${t('previewTemplate')}: ${t(template.nameKey)}`}
                  className="group block w-full overflow-hidden rounded-xl border border-border bg-paper-50 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-600 focus-visible:ring-offset-2"
                >
                  <div className="relative h-40 overflow-hidden">
                    <div className="absolute left-1/2 top-1/2 origin-center -translate-x-1/2 -translate-y-1/2 scale-[0.38]">
                      <QrCard
                        templateId={template.id}
                        storeName={storeName}
                        entryName={t('previewEntryDefault')}
                        url={previewUrl}
                        scanHint={scanHint}
                        qrAlt={qrAlt}
                      />
                    </div>
                    <span className="absolute right-2 top-2 inline-flex items-center rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-ink-900 shadow-sm">
                      {t('previewTemplate')}
                    </span>
                    {template.pro ? (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-gold-600 px-2 py-1 text-[10px] font-black uppercase text-white">
                        <LockSimpleIcon className="size-3" />
                        {t('proBadge')}
                      </span>
                    ) : null}
                    <span className="absolute inset-0 bg-jade-600/0 transition-colors group-hover:bg-jade-600/10" />
                  </div>
                </button>
                <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-900">{t(template.nameKey)}</p>
                    {isActive ? (
                      <p className="mt-0.5 text-xs font-semibold text-jade-600">
                        {t('templateSelected')}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    disabled={!available}
                    aria-pressed={isActive}
                    onClick={() => onSelectTemplate(template.id)}
                    className={[
                      'min-h-9 shrink-0 rounded-lg px-2.5 text-xs font-bold',
                      isActive ? 'bg-jade-600 text-white' : 'border border-border text-ink-900',
                    ].join(' ')}
                  >
                    {isActive
                      ? t('templateSelected')
                      : available
                        ? t('useTemplate')
                        : t('proBadge')}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        {plan === 'free' ? (
          <p className="text-xs text-muted-foreground">{t('proTemplateLocked')}</p>
        ) : null}
      </section>

      {previewTemplate ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/45 p-3 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            aria-label={t('closePreview')}
            onClick={() => setPreviewTemplateId(null)}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-preview-title"
            className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t('previewTemplate')}
                </p>
                <h2
                  id="template-preview-title"
                  className="truncate text-lg font-black text-ink-900"
                >
                  {t('previewTitle', { template: t(previewTemplate.nameKey) })}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplateId(null)}
                aria-label={t('closePreview')}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-900 hover:bg-paper-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-600"
              >
                <XIcon className="size-5" />
              </button>
            </header>

            <div className="grid min-h-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="flex min-h-[18rem] items-center justify-center overflow-hidden bg-paper-50 p-3 sm:min-h-[22rem] sm:p-6">
                <div className="origin-center scale-[0.78] sm:scale-90 lg:scale-100">
                  <QrCard
                    templateId={previewTemplate.id}
                    storeName={previewFields.storeName}
                    entryName={previewFields.entryName}
                    url={previewUrl}
                    scanHint={previewFields.scanHint}
                    qrAlt={qrAlt}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-border p-4 sm:p-5 lg:border-l lg:border-t-0">
                <div>
                  <h3 className="text-sm font-bold text-ink-900">{t('previewEditTitle')}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t('previewEditHint')}
                  </p>
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-ink-900">
                    {t('previewStoreName')}
                    <input
                      value={previewFields.storeName}
                      maxLength={40}
                      onChange={(event) => updatePreviewField('storeName', event.target.value)}
                      className="mt-1.5 min-h-10 w-full rounded-lg border border-border px-3 text-sm font-normal outline-none ring-jade-600 focus:ring-2"
                    />
                  </label>
                  <label className="block text-xs font-bold text-ink-900">
                    {t('previewEntryName')}
                    <input
                      value={previewFields.entryName}
                      maxLength={40}
                      onChange={(event) => updatePreviewField('entryName', event.target.value)}
                      className="mt-1.5 min-h-10 w-full rounded-lg border border-border px-3 text-sm font-normal outline-none ring-jade-600 focus:ring-2"
                    />
                  </label>
                  <label className="block text-xs font-bold text-ink-900">
                    {t('previewScanHint')}
                    <input
                      value={previewFields.scanHint}
                      maxLength={48}
                      onChange={(event) => updatePreviewField('scanHint', event.target.value)}
                      className="mt-1.5 min-h-10 w-full rounded-lg border border-border px-3 text-sm font-normal outline-none ring-jade-600 focus:ring-2"
                    />
                  </label>
                </div>

                {previewIsAvailable ? null : (
                  <div className="rounded-xl border border-gold-600/40 bg-gold-600/10 p-3">
                    <p className="text-xs leading-5 text-ink-900">{t('proPreviewHint')}</p>
                    <a
                      href={upgradeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-gold-600 px-3 text-xs font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:ring-offset-2"
                    >
                      {t('upgradeToPro')}
                    </a>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  {previewIsAvailable ? (
                    <Button
                      type="button"
                      onClick={() => chooseTemplate(previewTemplate.id)}
                      className="min-h-11 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
                    >
                      {t('useTemplate')}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => setPreviewTemplateId(null)}
                    className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold text-ink-900"
                  >
                    {t('closePreview')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
