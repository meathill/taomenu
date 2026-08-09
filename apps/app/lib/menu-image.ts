/** 菜品图片：key 约定、MIME/体积校验（纯函数，可单测）。 */

export const MENU_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB
export const MENU_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type MenuImageMime = (typeof MENU_IMAGE_MIME)[number];

const KEY_RE =
  /^menu\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$/i;
const ENHANCEMENT_KEY_RE =
  /^menu-enhancements\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpeg$/i;

export function isValidMenuImageKey(key: string): boolean {
  return KEY_RE.test(key);
}

export function isValidPublicMenuMediaKey(key: string): boolean {
  return isValidMenuImageKey(key) || ENHANCEMENT_KEY_RE.test(key);
}

export function extensionForMime(mime: string): 'jpg' | 'png' | 'webp' | null {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return null;
  }
}

export function buildMenuImageKey(storeId: string, itemId: string, mime: MenuImageMime): string {
  const ext = extensionForMime(mime);
  if (!ext) {
    throw new Error('Unsupported mime');
  }
  return `menu/${storeId}/${itemId}/${crypto.randomUUID()}.${ext}`;
}

export function publicMediaPath(key: string): string {
  return `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export type ImageValidationError = 'UNSUPPORTED_TYPE' | 'TOO_LARGE' | 'EMPTY' | 'BAD_MAGIC';

/**
 * 校验 MIME、体积与简单文件头（防伪装扩展名）。
 */
export function validateMenuImageBytes(input: {
  mime: string;
  bytes: Uint8Array;
}): { ok: true; mime: MenuImageMime } | { ok: false; error: ImageValidationError } {
  if (!MENU_IMAGE_MIME.includes(input.mime as MenuImageMime)) {
    return { ok: false, error: 'UNSUPPORTED_TYPE' };
  }
  if (input.bytes.byteLength === 0) {
    return { ok: false, error: 'EMPTY' };
  }
  if (input.bytes.byteLength > MENU_IMAGE_MAX_BYTES) {
    return { ok: false, error: 'TOO_LARGE' };
  }
  if (!matchesMagic(input.mime as MenuImageMime, input.bytes)) {
    return { ok: false, error: 'BAD_MAGIC' };
  }
  return { ok: true, mime: input.mime as MenuImageMime };
}

function matchesMagic(mime: MenuImageMime, bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (mime === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  // RIFF....WEBP
  if (mime === 'image/webp') {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

export function contentTypeForKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}
