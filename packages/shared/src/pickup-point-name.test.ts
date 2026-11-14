import { describe, expect, it } from 'vitest';
import {
  CANONICAL_DEFAULT_PICKUP_POINT_NAME,
  canonicalizePickupPointName,
  displayPickupPointName,
  isSystemDefaultPickupPointName,
} from './pickup-point-name';

describe('pickup point default name', () => {
  it('把各语言的系统占位名识别为默认名', () => {
    expect(isSystemDefaultPickupPointName('Quầy')).toBe(true);
    expect(isSystemDefaultPickupPointName(' Counter ')).toBe(true);
    expect(isSystemDefaultPickupPointName('柜台')).toBe(true);
    expect(isSystemDefaultPickupPointName('カウンター')).toBe(true);
    expect(isSystemDefaultPickupPointName('Quầy lấy món')).toBe(false);
    expect(isSystemDefaultPickupPointName('Front desk')).toBe(false);
  });

  it('新建或保存时把默认名写成语言无关的规范值', () => {
    expect(canonicalizePickupPointName('Quầy')).toBe(CANONICAL_DEFAULT_PICKUP_POINT_NAME);
    expect(canonicalizePickupPointName('  ')).toBe(CANONICAL_DEFAULT_PICKUP_POINT_NAME);
    expect(canonicalizePickupPointName('柜台')).toBe('Counter');
    expect(canonicalizePickupPointName('Quầy pickup')).toBe('Quầy pickup');
  });

  it('展示时按当前语言翻译默认名，自定义名保持原样', () => {
    expect(displayPickupPointName('Quầy', 'Counter')).toBe('Counter');
    expect(displayPickupPointName('Counter', '柜台')).toBe('柜台');
    expect(displayPickupPointName('Quầy lấy bánh', 'Counter')).toBe('Quầy lấy bánh');
  });
});
