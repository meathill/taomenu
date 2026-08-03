import { buildPushHTTPRequest } from '@pushforge/builder';
import type { PushSender, PushSendResult } from '@taomenu/db';
import { getEnv } from '@/lib/cf';

function getVapidConfig() {
  const env = getEnv();
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateJwkRaw = env.VAPID_PRIVATE_JWK;
  const subject = env.VAPID_SUBJECT || 'mailto:ops@dyqr.me';
  if (!publicKey || !privateJwkRaw) {
    return null;
  }
  let privateJWK: JsonWebKey;
  try {
    privateJWK = JSON.parse(privateJwkRaw) as JsonWebKey;
  } catch {
    return null;
  }
  return { publicKey, privateJWK, subject };
}

export function isPushConfigured(): boolean {
  return getVapidConfig() !== null;
}

export function getVapidPublicKey(): string | null {
  return getVapidConfig()?.publicKey ?? null;
}

/** Edge 兼容的 Web Push 发送（PushForge / Web Crypto）。 */
export function createPushSender(): PushSender {
  return async function sendPush({
    endpoint,
    p256dhKey,
    authKey,
    payload,
  }): Promise<PushSendResult> {
    const vapid = getVapidConfig();
    if (!vapid) {
      return { ok: false, statusCode: 0, permanentFailure: false };
    }

    try {
      const {
        endpoint: url,
        headers,
        body,
      } = await buildPushHTTPRequest({
        privateJWK: vapid.privateJWK,
        subscription: {
          endpoint,
          keys: {
            p256dh: p256dhKey,
            auth: authKey,
          },
        },
        message: {
          payload: payload as Record<string, string | number | boolean | null>,
          adminContact: vapid.subject,
          options: {
            // 高优先级：新订单需要尽快唤醒
            urgency: 'high',
            ttl: 60,
          },
        },
      });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      const statusCode = response.status;
      // 410 Gone / 404：subscription 永久失效
      const permanentFailure = statusCode === 404 || statusCode === 410;
      const ok = statusCode === 201 || statusCode === 200;
      return { ok, statusCode, permanentFailure };
    } catch {
      return { ok: false, statusCode: 0, permanentFailure: false };
    }
  };
}

/** 异步处理到期 outbox（不阻塞下单响应）。 */
export function scheduleOutboxProcessing(delayMs = 2200): void {
  const run = async () => {
    try {
      const { processDueOutbox } = await import('@taomenu/db');
      const { getDb } = await import('@/lib/db');
      await processDueOutbox(getDb(), createPushSender());
    } catch (error) {
      console.error('[push-outbox]', error);
    }
  };

  if (delayMs <= 0) {
    void run();
    return;
  }
  setTimeout(() => void run(), delayMs);
}
