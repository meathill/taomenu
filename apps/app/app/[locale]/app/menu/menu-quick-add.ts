import { getCurrencyDecimals, MENU_ITEM_NAME_MAX, parseCurrencyInput } from '@taomenu/shared';

/** 与 createItemSchema 的 name.max 一致 */
export const QUICK_ADD_NAME_MAX = MENU_ITEM_NAME_MAX;
/** 单次批量添加的行数上限，避免一次发出过多请求 */
export const QUICK_ADD_MAX_LINES = 50;

export type QuickAddItem = { line: number; name: string; priceAmount: number };
export type QuickAddErrorReason = 'format' | 'negative' | 'nameTooLong' | 'tooMany';
export type QuickAddError = { line: number; text: string; reason: QuickAddErrorReason };

// 名称 + 分隔符（- – — : | , 或空白）+ 可选货币符号 + 价格 + 可选单位/货币后缀
const LINE_PATTERN =
  /^(.+?)(?:\s*[-–—:：|,，\t]\s*|\s+)[^\s\d-]{0,3}(-?\d[\d.,]*)\s*[^\s\d]{0,4}$/u;
// "Baguette -3" 这类紧贴数字的负号：不能当成分隔符悄悄变成正数（issue #14 同类问题）
const NEGATIVE_TAIL_PATTERN = /(^|\s)-\d[\d.,]*\s*[^\s\d]{0,4}$/u;

function normalizePrice(raw: string, currency: string): string {
  // 2 位小数币种允许欧式小数逗号："12,50" → "12.50"
  if (getCurrencyDecimals(currency) > 0 && /^\d+,\d{1,2}$/.test(raw)) {
    return raw.replace(',', '.');
  }
  return raw;
}

/**
 * 把粘贴的多行文本解析成菜品：每行「菜名 - 价格」，也接受逗号、冒号、Tab 或空格分隔。
 * 解析不了的行原样返回给用户修改，不做猜测。
 */
export function parseQuickAddLines(
  text: string,
  currency: string,
): { items: QuickAddItem[]; errors: QuickAddError[] } {
  const items: QuickAddItem[] = [];
  const errors: QuickAddError[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = index + 1;
    const text = rawLine.trim();
    if (!text) return;
    if (items.length + errors.length >= QUICK_ADD_MAX_LINES) {
      errors.push({ line, text, reason: 'tooMany' });
      return;
    }
    if (NEGATIVE_TAIL_PATTERN.test(text)) {
      errors.push({ line, text, reason: 'negative' });
      return;
    }
    const matched = LINE_PATTERN.exec(text);
    const name = matched?.[1]?.trim() ?? '';
    const priceRaw = matched?.[2] ?? '';
    if (!matched || !name) {
      errors.push({ line, text, reason: 'format' });
      return;
    }
    if (priceRaw.startsWith('-')) {
      errors.push({ line, text, reason: 'negative' });
      return;
    }
    if (name.length > QUICK_ADD_NAME_MAX) {
      errors.push({ line, text, reason: 'nameTooLong' });
      return;
    }
    const priceAmount = parseCurrencyInput(normalizePrice(priceRaw, currency), currency);
    if (priceAmount === null) {
      errors.push({ line, text, reason: 'format' });
      return;
    }
    items.push({ line, name, priceAmount });
  });

  return { items, errors };
}
