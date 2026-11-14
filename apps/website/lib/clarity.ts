// Clarity 项目 ID 只含字母数字；不合法时直接不注入，避免把任意字符串拼进内联脚本
const CLARITY_ID_PATTERN = /^[a-z0-9]+$/i;

export function getClarityId(raw: string | undefined): string | null {
  const id = raw?.trim();
  if (!id || !CLARITY_ID_PATTERN.test(id)) return null;
  return id;
}
