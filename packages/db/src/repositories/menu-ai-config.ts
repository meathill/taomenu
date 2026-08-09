export const MENU_AI_PROVIDER = 'openai';
export const MENU_AI_MODEL = 'gpt-5.6-luna';
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
