'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);

  const refreshCapability = useCallback(() => {
    const cap = detectPushCapability();
    if (!cap.serviceWorker || !cap.pushManager || !cap.notification) {
      setStatus('unsupported');
      setMessage(
        cap.ios
          ? 'iOS cần Safari → Chia sẻ → Thêm vào Màn hình chính, rồi mở icon app.'
          : 'Trình duyệt không hỗ trợ Web Push.',
      );
      return cap;
    }
    if (cap.ios && !cap.standalone) {
      setStatus('need_install');
      setMessage(
        'iOS chỉ gửi Push sau khi cài PWA: Safari → nút Chia sẻ → “Thêm vào Màn hình chính”.',
      );
      return cap;
    }
    if (!cap.standalone && cap.ios === false) {
      // Android/desktop 可未安装就订阅，但建议安装
      setStatus('ready');
      return cap;
    }
    setStatus('ready');
    return cap;
  }, []);

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
          setMessage('Đã xác nhận thông báo. Máy này sẵn sàng nhận đơn nền.');
          window.history.replaceState({}, '', '/terminal');
        }
      })();
    }

    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, [refreshCapability, storeId]);

  async function enableNotifications() {
    setBusy(true);
    setMessage(null);
    try {
      const cap = refreshCapability();
      if (status === 'unsupported' || status === 'need_install') {
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setMessage('Bạn đã từ chối thông báo. Mở lại trong cài đặt trình duyệt.');
        setStatus('error');
        return;
      }

      const vapidRes = await fetch(`/api/owner/stores/${storeId}/push/vapid-public-key`);
      const vapid = (await vapidRes.json()) as { configured: boolean; publicKey: string | null };
      if (!vapid.configured || !vapid.publicKey) {
        setMessage('Server chưa cấu hình VAPID. Kiểm tra .dev.vars.');
        setStatus('error');
        return;
      }

      const reg = (await registerStaffServiceWorker()) || (await navigator.serviceWorker.ready);
      const sub = await subscribePush(reg, vapid.publicKey);
      if (!sub) {
        setMessage('Không tạo được subscription.');
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
        setMessage(saved.error || 'Lưu subscription thất bại.');
        setStatus('error');
        return;
      }

      setSubscriptionId(saved.subscriptionId);
      setStatus('subscribed');
      setMessage('Đã bật Push. Bấm “Gửi thử” rồi chạm thông báo để xác nhận.');
      void cap;
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!subscriptionId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/owner/stores/${storeId}/push/subscriptions/${subscriptionId}/test`,
        { method: 'POST' },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error || 'Gửi thử thất bại.');
        return;
      }
      setMessage('Đã gửi thử. Nếu máy khóa màn hình vẫn hiện — chạm thông báo để xác nhận.');
    } finally {
      setBusy(false);
    }
  }

  async function installPwa() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
      return;
    }
    setMessage(
      detectPushCapability().ios
        ? 'Trên iPhone: Safari → Chia sẻ → Thêm vào Màn hình chính.'
        : 'Dùng menu trình duyệt “Cài đặt ứng dụng” / “Add to Home screen”.',
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-ink-900">Cài PWA & thông báo đơn mới</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Đơn quan trọng: máy cần cài icon + bật Push. Không dựa vào tab luôn mở.
      </p>

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
            Cài ra màn hình chính
          </button>
        )}

        {(status === 'ready' || status === 'subscribed' || status === 'error') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void enableNotifications()}
            className="min-h-11 rounded-xl bg-jade-600 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? 'Đang bật…' : 'Bật thông báo đơn mới'}
          </button>
        )}

        {(status === 'subscribed' || status === 'verified') && subscriptionId ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendTest()}
            className="min-h-11 rounded-xl border border-jade-600 text-sm font-bold text-jade-600 disabled:opacity-60"
          >
            Gửi thông báo thử
          </button>
        ) : null}

        {status === 'verified' ? (
          <p className="text-xs font-semibold text-jade-600">
            ✓ Thông báo đã xác nhận trên máy này
          </p>
        ) : null}

        {status === 'unsupported' ? (
          <p className="text-xs text-muted-foreground">
            Hãy dùng Chrome/Edge (Android) hoặc Safari PWA (iOS 16.4+).
          </p>
        ) : null}
      </div>
    </section>
  );
}
