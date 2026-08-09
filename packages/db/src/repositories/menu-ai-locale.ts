import { doLocalesShareLanguage } from '@taomenu/shared';

export type MenuImportLocaleResolution = {
  targetLocale: string;
  shouldAdoptAsBaseLocale: boolean;
};

export function resolveMenuImportTargetLocale(input: {
  baseLocale: string;
  detectedLocale: string;
  hasExistingCategories: boolean;
}): MenuImportLocaleResolution | null {
  if (doLocalesShareLanguage(input.baseLocale, input.detectedLocale)) {
    return { targetLocale: input.baseLocale, shouldAdoptAsBaseLocale: false };
  }
  if (input.hasExistingCategories) return null;
  return { targetLocale: input.detectedLocale, shouldAdoptAsBaseLocale: true };
}
