/** 只接受站内相对路径，防止 ?next= 被用作开放重定向（`//evil.com`、`/\evil.com` 都拒绝）。 */
export function safeNextPath(raw: string | string[] | null | undefined, fallback: string): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}
