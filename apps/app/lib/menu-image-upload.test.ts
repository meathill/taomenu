import { describe, expect, it } from 'vitest';
import { MENU_IMAGE_MAX_BYTES } from './menu-image';
import { imageErrorKey, precheckMenuImageFile } from './menu-image-upload';

describe('precheckMenuImageFile（issue #18 新增菜品时选图）', () => {
  it('接受 jpeg/png/webp 且不超过上限', () => {
    expect(precheckMenuImageFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(precheckMenuImageFile({ type: 'image/webp', size: MENU_IMAGE_MAX_BYTES })).toBeNull();
  });

  it('拒绝其他类型、空文件和超限文件', () => {
    expect(precheckMenuImageFile({ type: 'image/gif', size: 10 })).toBe('UNSUPPORTED_TYPE');
    expect(precheckMenuImageFile({ type: 'image/png', size: 0 })).toBe('EMPTY');
    expect(precheckMenuImageFile({ type: 'image/png', size: MENU_IMAGE_MAX_BYTES + 1 })).toBe(
      'TOO_LARGE',
    );
  });

  it('imageErrorKey 只映射已知错误码', () => {
    expect(imageErrorKey('TOO_LARGE')).toBe('imageErrorTooLarge');
    expect(imageErrorKey('toString')).toBeNull();
    expect(imageErrorKey(undefined)).toBeNull();
  });
});
