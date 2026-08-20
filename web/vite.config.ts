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
  background_color: '#000000',
  theme_color: '#000000',
  icons: [
    {
      src: 'icons/smokelog-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: 'icons/smokelog-512.png',
      sizes: '512x512',
      type: 'image/png',
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
