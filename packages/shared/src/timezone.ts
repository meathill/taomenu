/** 店铺时区：IANA 名称校验与默认值（纯函数，前后端共用） */

export const DEFAULT_STORE_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** 是否为运行时可识别的 IANA 时区（如 Europe/Paris）；拒绝空串与随意文本 */
export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * 新店默认时区：优先用浏览器给出的时区（`Intl.DateTimeFormat().resolvedOptions().timeZone`），
 * 无效时退回越南（产品最初的目标市场）。
 */
export function resolveDefaultTimeZone(detected: string | null | undefined): string {
  return detected && isValidTimeZone(detected) ? detected : DEFAULT_STORE_TIMEZONE;
}

/** 下拉框的候选时区：运行时支持的全部 IANA 时区，并保证当前值一定在列表里 */
export function listTimeZones(current?: string): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const zones = new Set<string>(supported);
  zones.add(DEFAULT_STORE_TIMEZONE);
  if (current) zones.add(current);
  return [...zones].sort();
}
