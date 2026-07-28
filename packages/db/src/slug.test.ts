import { describe, expect, it } from 'vitest';
import { slugifyStoreName, withSlugSuffix } from './slug';

describe('slugifyStoreName', () => {
  it('处理越南语声调', () => {
    expect(slugifyStoreName('Phở Bò Hà Nội')).toBe('pho-bo-ha-noi');
  });

  it('空串回落 store', () => {
    expect(slugifyStoreName('!!!')).toBe('store');
  });

  it('截断过长名称', () => {
    const long = 'a'.repeat(80);
    expect(slugifyStoreName(long).length).toBeLessThanOrEqual(48);
  });
});

describe('withSlugSuffix', () => {
  it('首次不改', () => {
    expect(withSlugSuffix('cafe', 0)).toBe('cafe');
  });

  it('冲突时追加序号', () => {
    expect(withSlugSuffix('cafe', 1)).toBe('cafe-2');
  });
});
