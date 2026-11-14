import { doLocalesShareLanguage } from '@taomenu/shared';
import { z } from 'zod';
import { assertLocaleAllowed } from '../menu-publish';
import type { menuImportSuggestions } from '../schema/menu-ai';
import type { Db, StoreContext } from '../types';
import { listMenuLocales } from './menu';

/** 识别原文（识别语言与菜单语言不同、已翻译时才有，issue #29） */
export const originalSchema = z
  .object({
    locale: z.string().trim().min(2).max(16),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).nullable(),
  })
  .nullish();

const withOriginalSchema = z.object({ original: originalSchema });

/** 后台可选的菜单语言；原文语言不在其中时不保存原文 */
const SUPPORTED_MENU_LOCALES = ['en', 'vi', 'zh', 'ja'];

/** 原文语言（如 fr-FR）对应到支持的菜单语言；不支持或与目标语言相同则返回 null */
export function pickOriginalMenuLocale(
  originalLocale: string,
  targetLocale: string,
): string | null {
  const supported = SUPPORTED_MENU_LOCALES.find((candidate) =>
    doLocalesShareLanguage(candidate, originalLocale),
  );
  if (!supported || doLocalesShareLanguage(supported, targetLocale)) return null;
  return supported;
}

/**
 * 翻译导入（issue #29）时，原文能否作为第二语言一起保存：
 * 原文语言是支持的菜单语言、与目标语言不同，且当前套餐的语言数允许（Free 只有 1 种，直接跳过）。
 */
export async function resolveOriginalLocale(
  ctx: StoreContext,
  db: Db,
  input: {
    baseLocale: string;
    targetLocale: string;
    rows: Array<typeof menuImportSuggestions.$inferSelect>;
  },
): Promise<string | null> {
  let originalLocale: string | null = null;
  for (const row of input.rows) {
    const parsed = withOriginalSchema.safeParse(JSON.parse(row.suggestedValueJson));
    if (parsed.success && parsed.data.original) {
      originalLocale = parsed.data.original.locale;
      break;
    }
  }
  if (!originalLocale) return null;
  const locale = pickOriginalMenuLocale(originalLocale, input.targetLocale);
  if (!locale) return null;
  const issue = assertLocaleAllowed({
    plan: ctx.plan,
    baseLocale: input.baseLocale,
    locale,
    existingLocales: await listMenuLocales(ctx, db),
  });
  return issue ? null : locale;
}
