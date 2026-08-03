import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@taomenu/shared', '@taomenu/ui', '@taomenu/db'],
  serverExternalPackages: ['better-auth', '@better-auth/core'],
};

export default withNextIntl(nextConfig);

initOpenNextCloudflareForDev();
