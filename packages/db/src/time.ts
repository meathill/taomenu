/** 统一的当前时间 helper，避免各 repository 重复定义。 */
export function nowMs(): Date {
  return new Date();
}

/** 当前 UTC 月的第一天，用于月度额度统计。 */
export function currentUtcMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
