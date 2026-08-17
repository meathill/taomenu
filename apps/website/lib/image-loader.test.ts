import { afterEach, describe, expect, it, vi } from 'vitest';
import cloudflareImageLoader, { buildCloudflareImageUrl } from '../image-loader';

describe('image-loader', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('开发环境应直接返回原始 src', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(
      cloudflareImageLoader({
        src: '/images/landing/demo/hero.webp',
        width: 640,
        quality: 70,
      }),
    ).toBe('/images/landing/demo/hero.webp');
  });

  it('生产环境应为站内相对路径生成 Cloudflare Transform URL', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(
      cloudflareImageLoader({
        src: '/images/landing/demo/hero.webp',
        width: 640,
        quality: 70,
      }),
    ).toBe(
      '/cdn-cgi/image/fit=scale-down,format=auto,width=640,quality=70/images/landing/demo/hero.webp',
    );
  });

  it('应去掉前导斜杠并保留查询参数', () => {
    expect(
      buildCloudflareImageUrl({
        src: '/screenshots/nha-hang-pho-xua/staff.webp',
        width: 1280,
        quality: 75,
      }),
    ).toBe(
      '/cdn-cgi/image/fit=scale-down,format=auto,width=1280,quality=75/screenshots/nha-hang-pho-xua/staff.webp',
    );
  });

  it('未传 quality 时不应追加质量参数', () => {
    expect(
      buildCloudflareImageUrl({
        src: '/brand/taomenu-mark.svg',
        width: 32,
        quality: undefined,
      }),
    ).toBe('/cdn-cgi/image/fit=scale-down,format=auto,width=32/brand/taomenu-mark.svg');
  });
});
