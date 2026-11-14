import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    // next-intl 的 ESM 产物以无扩展名方式引用 next/server，交给 vite 处理才能在 Node 下解析
    server: { deps: { inline: ['next-intl'] } },
  },
});
