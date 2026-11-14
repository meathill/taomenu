/** 字数提示：接近上限（≥80%）才显示，达到上限时高亮 */
export function charCountState(length: number, max: number): 'hidden' | 'near' | 'limit' {
  if (length >= max) return 'limit';
  if (length >= Math.floor(max * 0.8)) return 'near';
  return 'hidden';
}
