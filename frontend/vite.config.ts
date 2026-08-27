import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { productImportPlugin } from './vite-plugins/product-import'

export default defineConfig({
  // قارئ روابط المنتجات — تطوير فقط، ما يدخل نسخة الإنتاج
  plugins: [react(), tailwindcss(), productImportPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
