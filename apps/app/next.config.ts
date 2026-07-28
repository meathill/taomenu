import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@taomenu/shared', '@taomenu/ui', '@taomenu/db'],
  serverExternalPackages: ['better-auth', '@better-auth/core'],
};

export default nextConfig;

initOpenNextCloudflareForDev();
