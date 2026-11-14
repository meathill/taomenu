import type { PlanId } from '@taomenu/shared';

export const MENU_AI_PROVIDER = 'openai';
export const MENU_AI_MODEL = 'gpt-5.6-luna';
/** Free 套餐导入走小米 MiMo（issue #25）；实际调用的模型以 taomenu-ai 的 MIMO_MENU_MODEL 为准 */
export const MENU_AI_FREE_PROVIDER = 'mimo';
export const MENU_AI_FREE_MODEL = 'mimo-v2.6-flash';

/** 按套餐选择菜单识别的 provider/model，写进 menu_imports，由 taomenu-ai 据此分派 */
export function getMenuAiRoute(plan: PlanId): { provider: string; model: string } {
  return plan === 'pro'
    ? { provider: MENU_AI_PROVIDER, model: MENU_AI_MODEL }
    : { provider: MENU_AI_FREE_PROVIDER, model: MENU_AI_FREE_MODEL };
}
export const MENU_AI_PROMPT_VERSION = 'menu-extract-v1';
export const MENU_AI_SCHEMA_VERSION = 'menu-import-v1';

export class MenuImportError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'MenuImportError';
  }
}
