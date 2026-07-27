import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('合并 class 并去掉冲突的 tailwind 工具类', () => {
    expect(cn('px-2', 'px-4', false && 'hidden', 'text-sm')).toBe('px-4 text-sm');
  });
});
