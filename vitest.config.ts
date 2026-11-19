import { defineConfig } from 'vitest/config'

// Config separada da do app: os testes não precisam de React, Tailwind nem PWA.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
