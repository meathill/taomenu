'use client';

import { MicrophoneIcon, StopCircleIcon } from '@phosphor-icons/react';
import { getCurrencyDecimals, sanitizeCurrencyInput } from '@taomenu/shared';
import { useTranslations } from 'next-intl';
import { type FormEvent, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { parseVoiceMenuDraft } from './voice-menu-entry';

type SpeechRecognitionResultEventLike = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionErrorEventLike = { error: string };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type ItemDraft = {
  categoryId: string;
  name: string;
  price: string;
};

type MenuItemDraftFormProps = {
  draft: ItemDraft;
  currency: string;
  busyAction: string | null;
  onChange: (draft: ItemDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
  canUseVoiceAssistant: boolean;
};

export function MenuItemDraftForm({
  draft,
  currency,
  busyAction,
  onChange,
  onCancel,
  onSubmit,
  canUseVoiceAssistant,
}: MenuItemDraftFormProps) {
  const t = useTranslations('menu');
  const hasDecimals = getCurrencyDecimals(currency) > 0;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function startListening() {
    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceMessage(t('voiceUnsupported'));
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      const parsed = parseVoiceMenuDraft(transcript, currency);
      onChange({
        ...draft,
        name: parsed.name || draft.name,
        price: parsed.price || draft.price,
      });
      setVoiceMessage(parsed.price ? t('voiceDraftReady') : t('voicePriceMissing'));
    };
    recognition.onerror = (event) => {
      setVoiceMessage(
        event.error === 'not-allowed' ? t('voicePermissionDenied') : t('voiceFailed'),
      );
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setVoiceMessage(t('voiceListeningHint'));
    setIsListening(true);
    recognition.start();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2 rounded-xl bg-paper-50 p-3">
      {canUseVoiceAssistant ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink-900">{t('voiceEntry')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('voiceExample')}</p>
            </div>
            <Button
              type="button"
              iconOnly
              aria-label={isListening ? t('voiceStop') : t('voiceStart')}
              title={isListening ? t('voiceStop') : t('voiceStart')}
              onClick={isListening ? stopListening : startListening}
              className="size-11 shrink-0 rounded-xl bg-indigo-700 text-white"
            >
              {isListening ? (
                <StopCircleIcon className="size-5" weight="fill" aria-hidden />
              ) : (
                <MicrophoneIcon className="size-5" weight="fill" aria-hidden />
              )}
            </Button>
          </div>
          {voiceMessage ? (
            <p className="mt-2 text-xs font-semibold text-indigo-800" role="status">
              {voiceMessage}
            </p>
          ) : null}
        </div>
      ) : null}
      <input
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        placeholder={t('itemName')}
        className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none ring-jade-600 focus:ring-2"
      />
      <input
        value={draft.price}
        onChange={(e) =>
          onChange({ ...draft, price: sanitizeCurrencyInput(e.target.value, currency) })
        }
        placeholder={t('price', { currency })}
        inputMode={hasDecimals ? 'decimal' : 'numeric'}
        className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base tabular-nums outline-none ring-jade-600 focus:ring-2"
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="min-h-12 flex-1 rounded-xl border border-border text-sm font-bold"
          onClick={onCancel}
        >
          {t('cancel')}
        </button>
        <Button
          type="submit"
          pending={busyAction === 'addItem'}
          busy={busyAction !== null}
          className="min-h-12 flex-1 rounded-xl bg-jade-600 text-sm font-bold text-white"
        >
          {t('saveContinue')}
        </Button>
      </div>
    </form>
  );
}
