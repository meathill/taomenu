import { isAdminEmail } from '@/lib/admin-access';
import { getEnv } from '@/lib/cf';
import { getSession } from '@/lib/session';

export type AdminSession = {
  userId: string;
  email: string;
};

/**
 * root 管理员会话；非 admin（含未登录、未配置 ADMIN_EMAIL）一律返回 null。
 * 调用方自行决定 null 的表现：页面里未登录跳登录、已登录则 notFound()；API 里一律 404，
 * 不暴露 /admin 的存在。
 */
export async function requireAdmin(): Promise<AdminSession | null> {
  const session = await getSession();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return null;
  }
  if (!isAdminEmail(email, getEnv().ADMIN_EMAIL)) {
    return null;
  }
  return { userId, email };
}
