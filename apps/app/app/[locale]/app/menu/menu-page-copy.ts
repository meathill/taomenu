export function getMenuSubtitleKey(plan: 'free' | 'pro') {
  return plan === 'pro' ? 'subtitlePro' : 'subtitle';
}
