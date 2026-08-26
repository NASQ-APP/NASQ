import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // منطق نقي بلا DOM — الآلة والخدمة مفصولتان عن React عمدًا
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
