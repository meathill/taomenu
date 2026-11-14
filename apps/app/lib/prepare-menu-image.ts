import { type ImageValidationError, MENU_IMAGE_MAX_BYTES, MENU_IMAGE_MIME } from './menu-image';

/** 选图控件：允许系统相册里的 HEIC，以及常见网页格式 */
export const MENU_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

export const MENU_IMAGE_MAX_EDGE = 1600;

export type PrepareMenuImageError = ImageValidationError | 'HEIC_UNSUPPORTED' | 'COMPRESS_FAILED';

const HEIC_BRANDS = new Set(['heic', 'heix', 'heif', 'hevc', 'mif1', 'msf1']);

export function isHeicLikeFile(file: { name: string; type: string }): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

export function hasHeicMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const ftyp = String.fromCharCode(bytes[4]!, bytes[5]!, bytes[6]!, bytes[7]!);
  if (ftyp !== 'ftyp') return false;
  const brand = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!).toLowerCase();
  return HEIC_BRANDS.has(brand);
}

export function fitImageSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function needsCompress(input: {
  size: number;
  width: number;
  height: number;
  heic: boolean;
}): boolean {
  return (
    input.heic ||
    input.size > MENU_IMAGE_MAX_BYTES ||
    Math.max(input.width, input.height) > MENU_IMAGE_MAX_EDGE
  );
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('decode'));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', quality);
  });
  if (!blob) throw new Error('encode');
  return blob;
}

async function convertHeic(blob: Blob): Promise<Blob> {
  const heic2any = (await import('heic2any')).default;
  const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.9 });
  return Array.isArray(result) ? result[0]! : result;
}

function drawToCanvas(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

/**
 * 把店主选的照片压到限制以内：HEIC 先转 JPEG，再按边长与体积缩小。
 * 已符合格式和大小的 JPEG/PNG/WebP 会原样返回。
 */
export async function prepareMenuImageFile(
  file: File,
): Promise<{ ok: true; file: File } | { ok: false; error: PrepareMenuImageError }> {
  if (file.size === 0) return { ok: false, error: 'EMPTY' };

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const heic = isHeicLikeFile(file) || hasHeicMagic(header);
  const allowedType = (MENU_IMAGE_MIME as readonly string[]).includes(file.type);

  // 空 MIME（部分手机相册）先尝试解码；明确的非支持类型直接拒绝
  if (!heic && file.type && !allowedType) {
    return { ok: false, error: 'UNSUPPORTED_TYPE' };
  }

  let source: Blob = file;
  if (heic) {
    try {
      source = await convertHeic(file);
    } catch {
      return { ok: false, error: 'HEIC_UNSUPPORTED' };
    }
  }

  let image: HTMLImageElement;
  try {
    image = await blobToImage(source);
  } catch {
    return { ok: false, error: heic ? 'HEIC_UNSUPPORTED' : 'BAD_MAGIC' };
  }

  if (
    !needsCompress({
      size: source.size,
      width: image.naturalWidth,
      height: image.naturalHeight,
      heic,
    })
  ) {
    return { ok: true, file };
  }

  try {
    const qualities = [0.85, 0.72, 0.6, 0.48];
    const edges = [MENU_IMAGE_MAX_EDGE, 1280, 1024, 800];
    let last: Blob | null = null;
    for (const edge of edges) {
      const size = fitImageSize(image.naturalWidth, image.naturalHeight, edge);
      const canvas = drawToCanvas(image, size.width, size.height);
      for (const quality of qualities) {
        last = await canvasToJpeg(canvas, quality);
        if (last.size <= MENU_IMAGE_MAX_BYTES) {
          const next = new File([last], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, {
            type: 'image/jpeg',
          });
          return { ok: true, file: next };
        }
      }
    }
    if (last && last.size <= MENU_IMAGE_MAX_BYTES) {
      return {
        ok: true,
        file: new File([last], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' }),
      };
    }
    return { ok: false, error: 'TOO_LARGE' };
  } catch {
    return { ok: false, error: 'COMPRESS_FAILED' };
  }
}
