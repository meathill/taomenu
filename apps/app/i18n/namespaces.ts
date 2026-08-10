/** 字典命名空间（与 messages/<locale>/*.json 文件名一致）；meta 仅服务端 generateMetadata 用 */
export const MESSAGE_NAMESPACES = [
  'meta',
  'common',
  'shell',
  'login',
  'owner',
  'onboarding',
  'menu',
  'tables',
  'terminal',
  'customer',
  'admin',
  'agent',
] as const;

export type MessageNamespace = (typeof MESSAGE_NAMESPACES)[number];

/** 全局壳（header/footer）始终需要，随 layout Provider 下发到客户端 */
export const SHELL_NAMESPACES = ['common', 'shell'] as const satisfies readonly MessageNamespace[];
