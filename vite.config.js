import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Libera acesso externo (LAN)
    proxy: {
      '/api/search': {
        target: 'https://serpapi.com/search.json',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/search/, '')
      }
    }
  }
})
