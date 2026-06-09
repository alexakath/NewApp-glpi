import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      '/apirest.php': {
        target: 'http://localhost',
        changeOrigin: true,
      },
      // Backend Node.js + SQLite
      '/backend': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
      },
    },
  },
})
