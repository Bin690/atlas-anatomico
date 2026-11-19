import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // App instalável e utilizável sem internet: a interface é pré-armazenada e os modelos 3D
    // (grandes) ficam em cache à medida que são usados — ou todos de uma vez pelo painel de camadas.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Atlas Anatômico 3D',
        short_name: 'Atlas 3D',
        description: 'Atlas anatômico 3D interativo para estudantes de medicina e enfermagem.',
        lang: 'pt-BR',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/models/') && url.pathname.endsWith('.glb'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'modelos-3d',
              expiration: { maxEntries: 40 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // Expõe o servidor na rede local para testar no celular/iPad (mesma rede Wi-Fi)
  server: { host: true },
  preview: { host: true },
  // three.js + drei formam um chunk grande por natureza; ele só é baixado sob demanda
  build: { chunkSizeWarningLimit: 1300 },
})
