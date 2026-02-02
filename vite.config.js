import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/nelondlc/', // Замените на имя вашего репозитория
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      },
    },
  },
})
