import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      'process.env': env,
    },
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api/ws': {
          target: 'ws://backend:8000',
          ws: true,
        },
        '/api': {
          target: 'http://backend:8000',
          changeOrigin: true,
        },
        '/docs': {
          target: 'http://backend:8000',
          changeOrigin: true,
        },
        '/openapi.json': {
          target: 'http://backend:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
