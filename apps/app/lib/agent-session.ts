import { type AgentRow, findActiveAgentByEmail } from '@taomenu/db';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * 当前登录用户对应的代理商；不是代理商（含未登录、已停用）一律返回 null。
 * agent ↔ user 按 email 匹配（两边都 lowercase），停用的代理商查不出来，天然失去访问权。
 * 调用方自行决定 null 的表现：/agent 页未登录跳登录，已登录则给「无权限」提示页——
 * 代理商链接是我们主动发出去的，登错邮箱时对方需要看懂发生了什么。
 */
export async function requireAgent(): Promise<AgentRow | null> {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) {
    return null;
  }
  return findActiveAgentByEmail(getDb(), email);
}
