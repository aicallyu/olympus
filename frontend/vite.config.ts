import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['olymp.onioko.com', 'olympus-api.onioko.com', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'https://olympus-api.onioko.com',
        changeOrigin: true,
      },
    },
  },
})
