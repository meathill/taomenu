import { describe, expect, it } from 'vitest';
import { readLocalePrefix, stripLocalePrefix } from './locale-prefix';

describe('readLocalePrefix（issue #27）', () => {
  it('识别受支持的语言前缀', () => {
    expect(readLocalePrefix('/zh/login')).toBe('zh');
    expect(readLocalePrefix('/en/login')).toBe('en');
    expect(readLocalePrefix('/ja')).toBe('ja');
    expect(readLocalePrefix('/vi/m/shop/t/token')).toBe('vi');
  });

  it('无前缀或不支持的前缀返回 null，交给协商', () => {
    expect(readLocalePrefix('/login')).toBeNull();
    expect(readLocalePrefix('/')).toBeNull();
    expect(readLocalePrefix('/fr/login')).toBeNull();
    expect(readLocalePrefix('/m/zh-shop/t/token')).toBeNull();
  });
});

describe('stripLocalePrefix', () => {
  it('去掉受支持的语言前缀，保留其余路径', () => {
    expect(stripLocalePrefix('/vi/app/menu')).toBe('/app/menu');
    expect(stripLocalePrefix('/zh/login')).toBe('/login');
    expect(stripLocalePrefix('/ja/m/shop/t/token')).toBe('/m/shop/t/token');
    expect(stripLocalePrefix('/en')).toBe('/');
    expect(stripLocalePrefix('/vi/')).toBe('/');
  });

  it('无前缀或不支持的前缀保持原样', () => {
    expect(stripLocalePrefix('/login')).toBe('/login');
    expect(stripLocalePrefix('/app/menu')).toBe('/app/menu');
    expect(stripLocalePrefix('/m/zh-shop/t/token')).toBe('/m/zh-shop/t/token');
    expect(stripLocalePrefix('/fr/app/menu')).toBe('/fr/app/menu');
    expect(stripLocalePrefix('/')).toBe('/');
  });
});
