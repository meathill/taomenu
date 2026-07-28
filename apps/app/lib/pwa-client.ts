'use client';

export type PushCapability = {
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
  permission: NotificationPermission | 'unsupported';
  standalone: boolean;
  ios: boolean;
};

export function detectPushCapability(): PushCapability {
  if (typeof window === 'undefined') {
    return {
      serviceWorker: false,
      pushManager: false,
      notification: false,
      permission: 'unsupported',
      standalone: false,
      ios: false,
    };
  }

  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  const notification = 'Notification' in window;
  const serviceWorker = 'serviceWorker' in navigator;
  const pushManager = serviceWorker && 'PushManager' in window;

  return {
    serviceWorker,
    pushManager,
    notification,
    permission: notification ? Notification.permission : 'unsupported',
    standalone,
    ios,
  };
}

export async function registerStaffServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  // 顾客页不注册 SW（由调用方保证）；此处再挡一层 /m/
  if (window.location.pathname.startsWith('/m/')) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (error) {
    console.error('[sw] register failed', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export async function subscribePush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      return existing;
    }
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });
  } catch (error) {
    console.error('[push] subscribe failed', error);
    return null;
  }
}

export function platformHint(): string {
  const cap = detectPushCapability();
  if (cap.ios) return 'ios';
  if (/Android/i.test(navigator.userAgent)) return 'android';
  return 'desktop';
}
