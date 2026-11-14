import { describe, expect, it } from 'vitest';
import { readLocalePrefix } from './locale-prefix';

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
