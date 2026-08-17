import { describe, expect, it } from 'vitest';
import { resolveScreenshotLayout } from './screenshot-layout';

describe('resolveScreenshotLayout', () => {
  it('有宽高时按横竖判断', () => {
    expect(resolveScreenshotLayout('/any.webp', 1280, 800)).toEqual({
      layout: 'desktop',
      width: 1280,
      height: 800,
    });
    expect(resolveScreenshotLayout('/any.webp', 780, 1688)).toEqual({
      layout: 'phone',
      width: 780,
      height: 1688,
    });
  });

  it('未传尺寸时按桌面截图文件名识别', () => {
    expect(resolveScreenshotLayout('/screenshots/nha-hang-pho-xua/staff.webp').layout).toBe(
      'desktop',
    );
    expect(resolveScreenshotLayout('/screenshots/nha-hang-pho-xua/menu-editor.webp').layout).toBe(
      'desktop',
    );
    expect(resolveScreenshotLayout('/screenshots/nha-hang-pho-xua/qr-tables.webp').layout).toBe(
      'desktop',
    );
    expect(resolveScreenshotLayout('/screenshots/nha-hang-pho-xua/payment.webp').layout).toBe(
      'desktop',
    );
  });

  it('未传尺寸的手机截图默认为竖屏尺寸', () => {
    expect(resolveScreenshotLayout('/screenshots/nha-hang-pho-xua/menu.webp')).toEqual({
      layout: 'phone',
      width: 780,
      height: 1688,
    });
  });
});
