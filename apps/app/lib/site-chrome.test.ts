import { describe, expect, it } from 'vitest';
import { getPoweredByUrl, getSiteChrome } from './site-chrome';

describe('getSiteChrome（issue #20）', () => {
  it('顾客点单页只保留精简页脚', () => {
    expect(getSiteChrome('/m/qa-family-restaurant')).toBe('customer');
    expect(getSiteChrome('/m/qa-family-restaurant/t/abc')).toBe('customer');
  });

  it('商家后台与终端不显示站点外壳', () => {
    expect(getSiteChrome('/app')).toBe('workspace');
    expect(getSiteChrome('/app/menu')).toBe('workspace');
    expect(getSiteChrome('/terminal/pair')).toBe('workspace');
  });

  it('其他页面完整显示；slug 含 app 的店铺不会被误判', () => {
    expect(getSiteChrome('/login')).toBe('full');
    expect(getSiteChrome('/')).toBe('full');
    expect(getSiteChrome('/m/apple-cafe')).toBe('customer');
    expect(getSiteChrome('/mango')).toBe('full');
  });

  it('Powered by 链接带来源参数', () => {
    expect(getPoweredByUrl('https://menu.dyqr.me')).toBe(
      'https://menu.dyqr.me/?utm_source=menu&utm_medium=powered_by',
    );
  });
});
