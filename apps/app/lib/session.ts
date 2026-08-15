import { headers } from 'next/headers';
import { getAuth } from '@/lib/auth';

/** 当前登录会话；未登录返回 null。 */
export async function getSession() {
  return (await getAuth()).api.getSession({ headers: await headers() });
}

export async function requireUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}
