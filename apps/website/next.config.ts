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
};

export default withNextIntl(withMDX(nextConfig));

initOpenNextCloudflareForDev();
