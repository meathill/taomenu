/** 登录页是否从「免费开始」等注册入口进入（?intent=signup），用于切换成「创建免费门店」文案 */
export function isSignupIntent(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'signup';
}
