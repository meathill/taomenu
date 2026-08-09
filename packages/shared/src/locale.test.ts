import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  doLocalesShareLanguage,
  getPrimaryLanguage,
  isLocale,
  matchLocaleFromAcceptLanguage,
  matchLocaleFromCountry,
  resolveUiLocale,
} from './locale';

describe('locale', () => {
  it('比较菜单 BCP-47 locale 时忽略地区差异', () => {
    expect(getPrimaryLanguage('vi-VN')).toBe('vi');
    expect(doLocalesShareLanguage('vi', 'vi-VN')).toBe(true);
    expect(doLocalesShareLanguage('en', 'vi-VN')).toBe(false);
  });

  it('DEFAULT_LOCALE 为 en', () => {
    expect(DEFAULT_LOCALE).toBe('en');
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });

  it('Accept-Language 精确与前缀匹配', () => {
    expect(matchLocaleFromAcceptLanguage('vi')).toBe('vi');
    expect(matchLocaleFromAcceptLanguage('en-US,en;q=0.9')).toBe('en');
    expect(matchLocaleFromAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh');
    expect(matchLocaleFromAcceptLanguage('zh-Hans-CN')).toBe('zh');
    expect(matchLocaleFromAcceptLanguage('ja-JP,ja;q=0.9')).toBe('ja');
    expect(matchLocaleFromAcceptLanguage('fr-FR,fr;q=0.9')).toBeNull();
  });

  it('Accept-Language 按 q 排序', () => {
    expect(matchLocaleFromAcceptLanguage('fr;q=0.9,vi;q=0.8,en;q=0.1')).toBe('vi');
    expect(matchLocaleFromAcceptLanguage('ja;q=0.2,en;q=0.8')).toBe('en');
  });

  it('国家映射', () => {
    expect(matchLocaleFromCountry('VN')).toBe('vi');
    expect(matchLocaleFromCountry('jp')).toBe('ja');
    expect(matchLocaleFromCountry('CN')).toBe('zh');
    expect(matchLocaleFromCountry('US')).toBeNull();
  });

  it('resolveUiLocale 优先级：preferred → browser → country → en', () => {
    expect(resolveUiLocale({ preferred: 'ja', acceptLanguage: 'vi', country: 'CN' })).toBe('ja');
    expect(resolveUiLocale({ acceptLanguage: 'zh-CN', country: 'JP' })).toBe('zh');
    expect(resolveUiLocale({ acceptLanguage: 'fr-FR', country: 'JP' })).toBe('ja');
    expect(resolveUiLocale({ acceptLanguage: 'fr-FR', country: 'US' })).toBe('en');
    expect(resolveUiLocale({})).toBe('en');
  });
});
