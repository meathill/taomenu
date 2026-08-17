import createMDX from '@next/mdx';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm'],
  },
});

const nextConfig: NextConfig = {
  transpilePackages: ['@taomenu/shared', '@taomenu/ui'],
  images: {
    loader: 'custom',
    loaderFile: './image-loader.ts',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 300],
  },
};

export default withNextIntl(withMDX(nextConfig));

initOpenNextCloudflareForDev();
