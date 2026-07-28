const MAX_SLUG_LENGTH = 48;

/** 将门店名压成 URL 安全 slug；越南语去掉声调后小写连字符。 */
export function slugifyStoreName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');

  return base || 'store';
}

export function withSlugSuffix(base: string, attempt: number): string {
  if (attempt <= 0) {
    return base;
  }
  const suffix = `-${attempt + 1}`;
  const trimmed = base.slice(0, Math.max(1, MAX_SLUG_LENGTH - suffix.length));
  return `${trimmed}${suffix}`;
}
