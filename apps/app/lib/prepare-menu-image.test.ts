import { describe, expect, it } from 'vitest';
import { MENU_IMAGE_MAX_BYTES } from './menu-image';
import {
  fitImageSize,
  hasHeicMagic,
  isHeicLikeFile,
  MENU_IMAGE_MAX_EDGE,
  needsCompress,
} from './prepare-menu-image';

describe('prepare-menu-image helpers', () => {
  it('把过长边缩到上限，并保持比例', () => {
    expect(fitImageSize(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitImageSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitImageSize(1200, 2400, 1600)).toEqual({ width: 800, height: 1600 });
  });

  it('识别 HEIC 文件名、MIME 和文件头', () => {
    expect(isHeicLikeFile({ name: 'IMG_0001.HEIC', type: '' })).toBe(true);
    expect(isHeicLikeFile({ name: 'lunch.jpg', type: 'image/heif' })).toBe(true);
    expect(isHeicLikeFile({ name: 'lunch.jpg', type: 'image/jpeg' })).toBe(false);
    const bytes = new Uint8Array(16);
    bytes.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
    expect(hasHeicMagic(bytes)).toBe(true);
    expect(hasHeicMagic(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
  });

  it('超过体积或边长，或本身是 HEIC 时需要压缩', () => {
    expect(needsCompress({ size: 800_000, width: 800, height: 600, heic: false })).toBe(false);
    expect(
      needsCompress({ size: MENU_IMAGE_MAX_BYTES + 1, width: 800, height: 600, heic: false }),
    ).toBe(true);
    expect(
      needsCompress({ size: 1000, width: MENU_IMAGE_MAX_EDGE + 1, height: 10, heic: false }),
    ).toBe(true);
    expect(needsCompress({ size: 1000, width: 800, height: 600, heic: true })).toBe(true);
  });
});
