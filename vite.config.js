import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['villapadel-icon.ico', 'favicon.svg'],
      manifest: {
        name: 'VillaPadel',
        short_name: 'VillaPadel',
        description: 'Torneos, resultados y tabla de posiciones de VillaPadel Club.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // The background image is ~2.2MB; skip precaching it so the install
        // step doesn't force everyone to download it before the app is usable.
        globIgnores: ['**/background-*.png'],
        // A new deploy must take over open tabs immediately instead of waiting
        // for every tab to close — otherwise a tab left open from before a
        // deploy keeps running the old cached app shell (old JS, missing new
        // routes/components) until something forces a fresh fetch.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
