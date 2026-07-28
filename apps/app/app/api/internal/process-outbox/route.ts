import { processDueOutbox } from '@taomenu/db';
import { getEnv } from '@/lib/cf';
import { getDb } from '@/lib/db';
import { createPushSender, isPushConfigured } from '@/lib/push-send';

/**
 * 扫描未处理 outbox 并投递 Push。
 * 本地可用 curl 触发；生产可挂 Cron Trigger。
 * 可选保护：CRON_SECRET header。
 */
export async function POST(request: Request) {
  const env = getEnv();
  if (env.CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  if (!isPushConfigured()) {
    return Response.json({ processed: 0, configured: false });
  }

  const result = await processDueOutbox(getDb(), createPushSender());
  return Response.json({ ...result, configured: true });
}
