/** 店主界面展示套餐名时用翻译后的文案，不要直接显示 free / FREE。 */
export function planLabelKey(plan: string): 'planFree' | 'planPro' | 'planProPlus' {
  if (plan === 'pro_plus') return 'planProPlus';
  if (plan === 'pro') return 'planPro';
  return 'planFree';
}
