/** 所有套餐的菜单识别与 AI 翻译都走小米 MiMo（issue #28）；实际调用的模型以 taomenu-ai 的 MIMO_MENU_MODEL 为准 */
export const MENU_AI_PROVIDER = 'mimo';
export const MENU_AI_MODEL = 'mimo-v2.6-flash';
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
