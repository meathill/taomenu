import { APP_NAME } from '@taomenu/shared';
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: 'TaoMenu owner and staff PWA',
    start_url: '/app',
    display: 'standalone',
    background_color: '#FFF9F2',
    theme_color: '#2E6F5E',
    lang: 'vi',
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
    ],
  };
}
