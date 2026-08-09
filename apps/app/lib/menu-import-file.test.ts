import { describe, expect, it } from 'vitest';
import { MENU_IMPORT_MAX_BYTES, validateMenuImportFile } from './menu-import-file';

describe('菜单导入文件校验', () => {
  it('接受真实文件头的图片和 PDF', () => {
    expect(
      validateMenuImportFile({
        mimeType: 'application/pdf',
        bytes: new TextEncoder().encode('%PDF-1.7'),
      }),
    ).toEqual({ ok: true, mimeType: 'application/pdf' });
    expect(
      validateMenuImportFile({
        mimeType: 'image/jpeg',
        bytes: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
      }).ok,
    ).toBe(true);
  });

  it('拒绝伪装类型和超大文件', () => {
    expect(
      validateMenuImportFile({
        mimeType: 'application/pdf',
        bytes: new TextEncoder().encode('not a pdf'),
      }),
    ).toEqual({ ok: false, error: 'BAD_MAGIC' });
    expect(
      validateMenuImportFile({
        mimeType: 'image/png',
        bytes: new Uint8Array(MENU_IMPORT_MAX_BYTES + 1),
      }),
    ).toEqual({ ok: false, error: 'TOO_LARGE' });
  });
});
