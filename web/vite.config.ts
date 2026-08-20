import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export const pwaManifest = {
  name: 'Нікотин — облік',
  short_name: 'Нікотин',
  description: 'Приватний облік нікотинових продуктів і витрат.',
  lang: 'uk',
  display: 'standalone' as const,
  start_url: '/SmokeLog_PWA/',
  background_color: '#f5f1e8',
  theme_color: '#12332b',
  icons: [
    {
      src: 'icons/nicotine-192.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
    },
    {
      src: 'icons/nicotine-512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
  ],
}

export default defineConfig({
  base: '/SmokeLog_PWA/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: pwaManifest,
    }),
  ],
  test: {
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
  },
})
