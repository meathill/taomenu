export const MENU_IMPORT_MAX_BYTES = 12 * 1024 * 1024;
export const MENU_IMPORT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export type MenuImportMime = (typeof MENU_IMPORT_MIME_TYPES)[number];

export type MenuImportFileError = 'UNSUPPORTED_TYPE' | 'TOO_LARGE' | 'EMPTY' | 'BAD_MAGIC';

export function validateMenuImportFile(input: {
  mimeType: string;
  bytes: Uint8Array;
}): { ok: true; mimeType: MenuImportMime } | { ok: false; error: MenuImportFileError } {
  if (!MENU_IMPORT_MIME_TYPES.includes(input.mimeType as MenuImportMime)) {
    return { ok: false, error: 'UNSUPPORTED_TYPE' };
  }
  if (input.bytes.byteLength === 0) return { ok: false, error: 'EMPTY' };
  if (input.bytes.byteLength > MENU_IMPORT_MAX_BYTES) return { ok: false, error: 'TOO_LARGE' };
  if (!matchesMagic(input.mimeType as MenuImportMime, input.bytes)) {
    return { ok: false, error: 'BAD_MAGIC' };
  }
  return { ok: true, mimeType: input.mimeType as MenuImportMime };
}

function matchesMagic(mimeType: MenuImportMime, bytes: Uint8Array): boolean {
  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mimeType === 'image/webp') {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    );
  }
  return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
}

export function buildMenuImportKey(storeId: string, importId: string, mimeType: MenuImportMime) {
  const extension =
    mimeType === 'application/pdf'
      ? 'pdf'
      : mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
  return `menu-import/${storeId}/${importId}/source.${extension}`;
}
