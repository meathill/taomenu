/** 取餐点系统默认名的规范存储值（与语言无关）；历史占位文案同样视为默认名 */
export const CANONICAL_DEFAULT_PICKUP_POINT_NAME = 'Counter';

export const SYSTEM_DEFAULT_PICKUP_POINT_NAMES = [
  CANONICAL_DEFAULT_PICKUP_POINT_NAME,
  'Quầy',
  '柜台',
  'カウンター',
] as const;

const DEFAULT_NAMES = new Set<string>(SYSTEM_DEFAULT_PICKUP_POINT_NAMES);

export function isSystemDefaultPickupPointName(name: string | null | undefined): boolean {
  return DEFAULT_NAMES.has((name ?? '').trim());
}

export function canonicalizePickupPointName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || isSystemDefaultPickupPointName(trimmed)) {
    return CANONICAL_DEFAULT_PICKUP_POINT_NAME;
  }
  return trimmed;
}

export function displayPickupPointName(
  storedName: string | null | undefined,
  localizedDefault: string,
): string {
  if (!storedName?.trim() || isSystemDefaultPickupPointName(storedName)) {
    return localizedDefault;
  }
  return storedName.trim();
}
