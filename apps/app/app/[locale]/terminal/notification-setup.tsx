'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import {
  detectPushCapability,
  platformHint,
  registerStaffServiceWorker,
  subscribePush,
} from '@/lib/pwa-client';

type NotificationSetupProps = {
  storeId: string;
};

type Status =
  | 'idle'
  | 'loading'
  | 'need_install'
  | 'ready'
  | 'subscribed'
  | 'verified'
  | 'unsupported'
  | 'error';

export function NotificationSetup({ storeId }: NotificationSetupProps) {
  const t = useTranslations('terminal');
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);

  const refreshCapability = useCallback(() => {
    const cap = detectPushCapability();
    if (!cap.serviceWorker || !cap.pushManager || !cap.notification) {
      setStatus('unsupported');
      setMessage(cap.ios ? t('pushIosInstall') : t('pushNoSupport'));
      return cap;
    }
    if (cap.ios && !cap.standalone) {
      setStatus('need_install');
      setMessage(t('pushIosOnlyPwa'));
      return cap;
    }
    if (!cap.standalone && cap.ios === false) {
      // Android/desktop 可未安装就订阅，但建议安装
      setStatus('ready');
      return cap;
    }
    setStatus('ready');
    return cap;
  }, [t]);

  useEffect(() => {
    refreshCapability();

    function onBip(event: Event) {
      event.preventDefault();
      const e = event as Event & { prompt: () => Promise<void> };
      setDeferredPrompt({ prompt: () => e.prompt() });
    }
    window.addEventListener('beforeinstallprompt', onBip);

    // 注册 SW（仅 terminal / app，不在顾客页挂此组件）
    void registerStaffServiceWorker();

    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('push_verify');
    if (verifyId) {
      void (async () => {
        const res = await fetch(
          `/api/owner/stores/${storeId}/push/subscriptions/${verifyId}/verify`,
          { method: 'POST' },
        );
        if (res.ok) {
          setSubscriptionId(verifyId);
          setStatus('verified');
          setMessage(t('pushConfirmed'));
          window.history.replaceState({}, '', '/terminal');
        }
      })();
    }

    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, [refreshCapability, storeId, t]);

  async function enableNotifications() {
    setBusyAction('enable');
    setMessage(null);
    try {
      const cap = refreshCapability();
      if (status === 'unsupported' || status === 'need_install') {
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setMessage(t('pushDenied'));
        setStatus('error');
        return;
      }

      const vapidRes = await fetch(`/api/owner/stores/${storeId}/push/vapid-public-key`);
      const vapid = (await vapidRes.json()) as { configured: boolean; publicKey: string | null };
      if (!vapid.configured || !vapid.publicKey) {
        setMessage(t('pushNoVapid'));
        setStatus('error');
        return;
      }

      const reg = (await registerStaffServiceWorker()) || (await navigator.serviceWorker.ready);
      const sub = await subscribePush(reg, vapid.publicKey);
      if (!sub) {
        setMessage(t('pushSubFailed'));
        setStatus('error');
        return;
      }

      const json = sub.toJSON();
      const saveRes = await fetch(`/api/owner/stores/${storeId}/push/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          platform: platformHint(),
        }),
      });
      const saved = (await saveRes.json()) as { subscriptionId?: string; error?: string };
      if (!saveRes.ok || !saved.subscriptionId) {
        setMessage(saved.error || t('pushSaveFailed'));
        setStatus('error');
        return;
      }

      setSubscriptionId(saved.subscriptionId);
      setStatus('subscribed');
      setMessage(t('pushEnabled'));
      void cap;
    } finally {
      setBusyAction(null);
    }
  }

  async function sendTest() {
    if (!subscriptionId) return;
    setBusyAction('test');
    setMessage(null);
    try {
      const res = await fetch(
        `/api/owner/stores/${storeId}/push/subscriptions/${subscriptionId}/test`,
        { method: 'POST' },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || t('pushTestFailed'));
        return;
      }
      setMessage(t('pushTestSent'));
    } finally {
      setBusyAction(null);
    }
  }

  async function installPwa() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
      return;
    }
    setMessage(detectPushCapability().ios ? t('pushIosHint') : t('pushDesktopHint'));
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-ink-900">{t('pushTitle')}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('pushDesc')}</p>

      {message ? (
        <p
          className={
            status === 'verified' || status === 'subscribed'
              ? 'mt-3 text-xs font-medium text-jade-600'
              : 'mt-3 text-xs font-medium text-brand-600'
          }
        >
          {message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2">
        {(status === 'need_install' || deferredPrompt) && (
          <button
            type="button"
            onClick={() => void installPwa()}
            className="min-h-11 rounded-xl border border-border text-sm font-bold text-ink-900"
          >
            {t('pushInstall')}
          </button>
        )}

        {(status === 'ready' || status === 'subscribed' || status === 'error') && (
          <Button
            type="button"
            variant="default"
            pending={busyAction === 'enable'}
            busy={busyAction !== null}
            onClick={() => void enableNotifications()}
          >
            {t('pushEnable')}
          </Button>
        )}

        {(status === 'subscribed' || status === 'verified') && subscriptionId ? (
          <Button
            type="button"
            variant="outline"
            pending={busyAction === 'test'}
            busy={busyAction !== null}
            onClick={() => void sendTest()}
          >
            {t('pushTest')}
          </Button>
        ) : null}

        {status === 'verified' ? (
          <p className="text-xs font-semibold text-jade-600">{t('pushVerified')}</p>
        ) : null}

        {status === 'unsupported' ? (
          <p className="text-xs text-muted-foreground">{t('pushUnsupported')}</p>
        ) : null}
      </div>
    </section>
  );
}
