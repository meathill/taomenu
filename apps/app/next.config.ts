import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@taomenu/shared', '@taomenu/ui'],
};

export default nextConfig;

initOpenNextCloudflareForDev();
