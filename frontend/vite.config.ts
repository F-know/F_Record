import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3721',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3721',
        changeOrigin: true,
      },
    },
  },
})

