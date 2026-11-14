import { type ImageValidationError, MENU_IMAGE_MAX_BYTES, MENU_IMAGE_MIME } from './menu-image';
import { type PrepareMenuImageError, prepareMenuImageFile } from './prepare-menu-image';

/** 服务端错误码 → menu 命名空间的文案 key */
export const IMAGE_ERROR_KEYS: Record<PrepareMenuImageError, string> = {
  UNSUPPORTED_TYPE: 'imageErrorUnsupportedType',
  TOO_LARGE: 'imageErrorTooLarge',
  EMPTY: 'imageErrorEmpty',
  BAD_MAGIC: 'imageErrorBadMagic',
  HEIC_UNSUPPORTED: 'imageErrorHeicUnsupported',
  COMPRESS_FAILED: 'imageErrorCompressFailed',
};

export const MENU_IMAGE_MAX_MB = Math.floor(MENU_IMAGE_MAX_BYTES / (1024 * 1024));

/**
 * 选图后先在浏览器侧做类型/体积预检，免得菜品已创建、图片才被服务端拒绝。
 * 文件头（BAD_MAGIC）仍由服务端校验。
 */
export function precheckMenuImageFile(file: {
  type: string;
  size: number;
}): ImageValidationError | null {
  if (!(MENU_IMAGE_MIME as readonly string[]).includes(file.type)) return 'UNSUPPORTED_TYPE';
  if (file.size === 0) return 'EMPTY';
  if (file.size > MENU_IMAGE_MAX_BYTES) return 'TOO_LARGE';
  return null;
}

export function imageErrorKey(code: string | undefined): string | null {
  if (!code || !Object.hasOwn(IMAGE_ERROR_KEYS, code)) return null;
  return IMAGE_ERROR_KEYS[code as PrepareMenuImageError];
}

/** 先在浏览器里缩小/转换，再上传 */
export async function prepareAndUploadMenuItemImage(
  storeId: string,
  itemId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error?: string }> {
  const prepared = await prepareMenuImageFile(file);
  if (!prepared.ok) return prepared;
  return uploadMenuItemImage(storeId, itemId, prepared.file);
}

/** 上传菜品图片；失败时返回服务端错误码（若有） */
export async function uploadMenuItemImage(
  storeId: string,
  itemId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error?: string }> {
  const body = new FormData();
  body.set('file', file);
  const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}/image`, {
    method: 'POST',
    body,
  });
  if (res.ok) return { ok: true };
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return { ok: false, error: data?.error };
}

/** 先在浏览器里缩小/转换，再上传店铺封面 */
export async function prepareAndUploadStoreCover(
  storeId: string,
  file: File,
): Promise<{ ok: true; coverImageKey: string } | { ok: false; error?: string }> {
  const prepared = await prepareMenuImageFile(file);
  if (!prepared.ok) return prepared;
  const body = new FormData();
  body.set('file', prepared.file);
  const res = await fetch(`/api/owner/stores/${storeId}/branding/cover`, {
    method: 'POST',
    body,
  });
  const data = (await res.json().catch(() => null)) as {
    coverImageKey?: string;
    error?: string;
  } | null;
  if (res.ok && data?.coverImageKey) {
    return { ok: true, coverImageKey: data.coverImageKey };
  }
  return { ok: false, error: data?.error };
}

export async function deleteStoreCover(
  storeId: string,
): Promise<{ ok: true } | { ok: false; error?: string }> {
  const res = await fetch(`/api/owner/stores/${storeId}/branding/cover`, { method: 'DELETE' });
  if (res.ok) return { ok: true };
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return { ok: false, error: data?.error };
}
