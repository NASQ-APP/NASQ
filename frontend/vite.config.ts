import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { productImportPlugin } from './vite-plugins/product-import.ts'
import { agentChatPlugin } from './vite-plugins/agent-chat.ts'

export default defineConfig({
  // قارئ روابط المنتجات والستايليست — تطوير فقط، ما يدخلان نسخة الإنتاج
  plugins: [react(), tailwindcss(), productImportPlugin(), agentChatPlugin()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
