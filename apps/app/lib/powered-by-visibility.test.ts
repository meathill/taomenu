import { describe, expect, it } from 'vitest';
import { resolvePoweredByVisibility } from './powered-by-visibility';

describe('resolvePoweredByVisibility（issue #26）', () => {
  it('菜单未加载时先不渲染，避免 Pro 商家页面闪出水印', () => {
    expect(resolvePoweredByVisibility(undefined, false)).toBeNull();
    expect(resolvePoweredByVisibility(false, false)).toBeNull();
  });

  it('按服务端的 showPoweredBy 决定，缺字段（旧接口）时显示', () => {
    expect(resolvePoweredByVisibility(true, true)).toBe(true);
    expect(resolvePoweredByVisibility(false, true)).toBe(false);
    expect(resolvePoweredByVisibility(undefined, true)).toBe(true);
  });
});
