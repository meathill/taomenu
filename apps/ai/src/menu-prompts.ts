import { getCurrencyDecimals, type StoreCurrency } from '@taomenu/shared';

export type MenuImportAssetInput = {
  mimeType: string;
  bytes: Uint8Array;
};

/**
 * 按门店币种生成金额指令。
 * 金额一律以最小单位整数返回：0 位小数币种即主单位本身，2 位小数币种是「分」。
 */
export function buildPriceInstructions(currency: StoreCurrency): string[] {
  const decimals = getCurrencyDecimals(currency);
  if (decimals === 0) {
    return [
      `Prices are in ${currency}, a currency without decimal places: return every amount as the integer ${currency} value.`,
      'Shorthand such as 35k means the integer amount 35000.',
    ];
  }
  const factor = 10 ** decimals;
  return [
    `Prices are in ${currency}, which has ${decimals} decimal places: return every amount as an integer in the minor unit (1 ${currency} = ${factor} minor units).`,
    `A price printed as 5.99 ${currency} must be returned as 599, and 12 ${currency} as 1200.`,
    'Never return a decimal number and never drop the minor-unit digits.',
  ];
}

/** 菜单识别的用户指令（图片/PDF 文本之后追加） */
export function buildExtractInstructions(
  currency: StoreCurrency,
  expectedLocale?: string | null,
): string {
  return [
    'Extract only menu content that is visibly present in these assets.',
    'Preserve category and item order. Never invent names, descriptions, prices, or options.',
    ...buildPriceInstructions(currency),
    'Use null for an unreadable item price and add a concise warning.',
    `Set currency to the currency actually printed on the assets; the store currency is ${currency}.`,
    'Confidence must reflect visual certainty, especially for prices and modifier rules.',
    `Expected source locale when known: ${expectedLocale ?? 'detect from the asset'}.`,
  ].join('\n');
}

/** 菜单翻译的用户指令 */
export function buildTranslateInstructions(sourceLocale: string, targetLocale: string): string {
  return [
    `Translate restaurant menu content from ${sourceLocale} to ${targetLocale}.`,
    'Preserve every entityType and entityId exactly and return every input entity once.',
    'Translate names and descriptions naturally for restaurant guests. Do not add claims, ingredients, prices, or details absent from the source.',
    'Keep common dish names recognizable when a literal translation would be misleading.',
  ].join('\n');
}

export function toDataUrl(mimeType: string, bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
