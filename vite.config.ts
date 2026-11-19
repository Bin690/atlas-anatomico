import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expõe o servidor na rede local para testar no celular/iPad (mesma rede Wi-Fi)
  server: { host: true },
  preview: { host: true },
  // three.js + drei formam um chunk grande por natureza; ele só é baixado sob demanda
  build: { chunkSizeWarningLimit: 1300 },
})
