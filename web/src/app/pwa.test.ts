import { expect, test } from 'vitest'

import config, { pwaManifest } from '../../vite.config'

test('builds assets for the SmokeLog GitHub Pages path', () => {
  expect(config.base).toBe('/SmokeLog_PWA/')
})

test('declares a standalone Ukrainian PWA', () => {
  expect(pwaManifest.display).toBe('standalone')
  expect(pwaManifest.short_name).toBe('Нікотин')
  expect(pwaManifest.lang).toBe('uk')
  expect(pwaManifest.background_color).toBe('#000000')
  expect(pwaManifest.icons.map((icon) => icon.src)).toEqual(['icons/smokelog-192.png', 'icons/smokelog-512.png'])
})
