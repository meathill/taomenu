import { APP_NAME } from '@taomenu/shared';
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: APP_NAME,
    short_name: APP_NAME,
    description: 'TaoMenu — QR ordering and staff terminal',
    start_url: '/terminal',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FFF9F2',
    theme_color: '#2E6F5E',
    // manifest 会被浏览器缓存且无法按用户语言动态化，保持中性英文
    lang: 'en',
    categories: ['business', 'food'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
