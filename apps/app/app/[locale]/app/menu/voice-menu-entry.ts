const VIETNAMESE_DIGITS: Record<string, number> = {
  không: 0,
  một: 1,
  mốt: 1,
  hai: 2,
  ba: 3,
  bốn: 4,
  tư: 4,
  năm: 5,
  lăm: 5,
  sáu: 6,
  bảy: 7,
  tám: 8,
  chín: 9,
};

function parseSmallVietnameseNumber(tokens: string[]): number | null {
  const words = tokens.filter((token) => token !== 'linh' && token !== 'lẻ');
  if (words.length === 0) return 0;
  let value = 0;
  let index = 0;

  if (words[index + 1] === 'trăm') {
    const hundreds = VIETNAMESE_DIGITS[words[index] ?? ''];
    if (hundreds === undefined) return null;
    value += hundreds * 100;
    index += 2;
  }

  if (words[index] === 'mười') {
    value += 10;
    index += 1;
  } else if (words[index + 1] === 'mươi') {
    const tens = VIETNAMESE_DIGITS[words[index] ?? ''];
    if (tens === undefined) return null;
    value += tens * 10;
    index += 2;
  }

  if (index < words.length) {
    const units = VIETNAMESE_DIGITS[words[index] ?? ''];
    if (units === undefined || index !== words.length - 1) return null;
    value += units;
  }
  return value;
}

function parseVietnameseNumber(input: string): number | null {
  const tokens = input
    .toLocaleLowerCase('vi')
    .replace(/đồng/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const thousandIndex = tokens.findIndex((token) => token === 'nghìn' || token === 'ngàn');
  if (thousandIndex < 0) return parseSmallVietnameseNumber(tokens);
  if (tokens.findIndex((token, index) => index > thousandIndex && token.includes('ng')) >= 0) {
    return null;
  }
  const thousands = parseSmallVietnameseNumber(tokens.slice(0, thousandIndex));
  const remainder = parseSmallVietnameseNumber(tokens.slice(thousandIndex + 1));
  if (thousands === null || remainder === null) return null;
  return Math.max(1, thousands) * 1000 + remainder;
}

function parseNumericPrice(input: string): number | null {
  const match = input.match(/(\d+(?:[.,]\d+)?)\s*(nghìn|ngàn|k)?\s*(?:đồng)?\s*$/iu);
  if (!match) return null;
  const numeric = Number(match[1]?.replace(',', '.'));
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * (match[2] ? 1000 : 1));
}

export type VoiceMenuDraft = {
  name: string;
  price: string;
  transcript: string;
};

export function parseVoiceMenuDraft(transcript: string): VoiceMenuDraft {
  const cleaned = transcript.trim().replace(/[.!?]+$/u, '');
  const marker = cleaned.toLocaleLowerCase('vi').lastIndexOf(' giá ');
  if (marker < 0) {
    return { name: cleaned, price: '', transcript: cleaned };
  }

  const name = cleaned
    .slice(0, marker)
    .trim()
    .replace(/[,;]+$/u, '');
  const pricePhrase = cleaned.slice(marker + 5).trim();
  const price = parseNumericPrice(pricePhrase) ?? parseVietnameseNumber(pricePhrase);
  return {
    name,
    price: price === null ? '' : String(price),
    transcript: cleaned,
  };
}
