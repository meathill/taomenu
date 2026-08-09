import { describe, expect, it } from 'vitest';
import {
  buildMenuImageKey,
  isValidMenuImageKey,
  isValidPublicMenuMediaKey,
  publicMediaPath,
  validateMenuImageBytes,
} from './menu-image';

const storeId = '00000000-0000-4000-8000-000000000001';
const itemId = '00000000-0000-4000-8000-000000000002';

describe('menu image key', () => {
  it('生成并校验 key', () => {
    const key = buildMenuImageKey(storeId, itemId, 'image/jpeg');
    expect(isValidMenuImageKey(key)).toBe(true);
    expect(key.startsWith(`menu/${storeId}/${itemId}/`)).toBe(true);
    expect(key.endsWith('.jpg')).toBe(true);
  });

  it('拒绝路径穿越', () => {
    expect(isValidMenuImageKey('menu/../secret.jpg')).toBe(false);
    expect(isValidMenuImageKey(`menu/${storeId}/${itemId}/x.exe`)).toBe(false);
  });

  it('只公开符合约定的 AI 图片预览 key', () => {
    const jobId = '00000000-0000-4000-8000-000000000003';
    expect(isValidPublicMenuMediaKey(`menu-enhancements/${storeId}/${itemId}/${jobId}.jpeg`)).toBe(
      true,
    );
    expect(isValidPublicMenuMediaKey(`menu-enhancements/${storeId}/${itemId}/../x.jpeg`)).toBe(
      false,
    );
    expect(isValidPublicMenuMediaKey(`menu-enhancements/${storeId}/${itemId}/${jobId}.exe`)).toBe(
      false,
    );
  });

  it('public path 分段编码', () => {
    const path = publicMediaPath(`menu/${storeId}/${itemId}/a.jpg`);
    expect(path.startsWith('/api/media/menu/')).toBe(true);
    expect(path.includes('..')).toBe(false);
  });
});

describe('validateMenuImageBytes', () => {
  it('接受 JPEG 魔数', () => {
    const bytes = new Uint8Array(32);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    const result = validateMenuImageBytes({ mime: 'image/jpeg', bytes });
    expect(result.ok).toBe(true);
  });

  it('拒绝伪 JPEG', () => {
    const bytes = new Uint8Array(32);
    bytes.fill(1);
    const result = validateMenuImageBytes({ mime: 'image/jpeg', bytes });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('BAD_MAGIC');
  });

  it('拒绝过大文件', () => {
    const bytes = new Uint8Array(2 * 1024 * 1024 + 1);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    const result = validateMenuImageBytes({ mime: 'image/jpeg', bytes });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('TOO_LARGE');
  });
});
