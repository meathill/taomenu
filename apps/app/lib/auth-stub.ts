/**
 * 阶段 0 会话占位。阶段 1 接入 Better Auth 后删除此模块。
 * 开发时设置 cookie `taomenu_dev_session=1` 可进入 /app。
 */
export const DEV_SESSION_COOKIE = 'taomenu_dev_session';

export function hasDevSession(cookieHeader: string | null): boolean {
  if (!cookieHeader) {
    return false;
  }
  return cookieHeader.split(';').some((part) => part.trim() === `${DEV_SESSION_COOKIE}=1`);
}
