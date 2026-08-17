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
  // 纯 SSG（Cloudflare Workers Static Assets）无运行时图片优化器；
  // 素材已预压缩为 WebP，直接原样输出。
  images: { unoptimized: true },
};

export default withNextIntl(withMDX(nextConfig));

initOpenNextCloudflareForDev();
