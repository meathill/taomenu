import { recordAgentClick } from '@taomenu/db';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { computeVisitorHash, normalizeRefCode, readClientIp, toUtcDay } from '@/lib/ref-click';

const refClickSchema = z.object({
  code: z.string(),
  source: z.enum(['website', 'app']),
});

/**
 * 恒返 204：这是完全公开的上报入口，
 * 既不能泄露某个 code 是否存在，也不该因为脏 body 就给出可区分的错误。
 */
function noContent(): Response {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    // website 侧用 no-cors fetch 上报（body 为 text/plain 免 preflight），所以不能用 request.json()
    const parsed = refClickSchema.safeParse(JSON.parse(await request.text()));
    if (!parsed.success) {
      return noContent();
    }

    const code = normalizeRefCode(parsed.data.code);
    if (!code) {
      return noContent();
    }

    const day = toUtcDay(new Date());
    const visitorHash = await computeVisitorHash({
      ip: readClientIp(request.headers),
      userAgent: request.headers.get('user-agent') ?? '',
      day,
      code,
    });

    // code 无效 / 代理商停用时内部静默丢弃；同 (agent, day, visitor) 重复点击由唯一索引去重
    await recordAgentClick(getDb(), { code, source: parsed.data.source, visitorHash, day });
  } catch {
    // 解析异常、DB 异常一律吞掉，对外只有 204
  }

  return noContent();
}
