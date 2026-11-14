/** 用该语言自己的名称显示选项，方便游客在不识店主界面语言时认出自己的语言 */
export function languageEndonym(locale: string): string {
  const language = locale.split('-')[0] || locale;
  try {
    return new Intl.DisplayNames([language], { type: 'language' }).of(language) ?? language;
  } catch {
    return language;
  }
}
