import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// 讓啟動地址從127.0.0.1改為localhost
import dns from'dns'
dns.setDefaultResultOrder('verbatim')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
