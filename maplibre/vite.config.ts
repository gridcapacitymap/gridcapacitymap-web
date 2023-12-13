import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const baseURL = process.env.BACKEND_API_URL || 'http://gridmap_backend:8000';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/ws': {
        target: baseURL.replace('http://', 'ws://'),
        ws: true,
      },
      '/api': {
        target: baseURL,
        changeOrigin: true,
      },
      '/docs': {
        target: baseURL,
        changeOrigin: true,
      },
      '/openapi.json': {
        target: baseURL,
        changeOrigin: true,
      },
    },
  },
});
