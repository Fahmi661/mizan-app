import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/supabase': {
          target: 'https://ufxjvugkmiorxlogvcmx.supabase.co',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Use environment variables for credentials
              const anonKey = env.VITE_SUPABASE_ANON_KEY;
              if (anonKey) {
                proxyReq.setHeader('apikey', anonKey);
                proxyReq.setHeader('Authorization', `Bearer ${anonKey}`);
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              // Konfigurasi CORS "Mizan" di proxy server
              proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin?.includes('mizan') ? req.headers.origin : '*';
            });
          }
        },
        '/api/aladhan': {
          target: env.VITE_ALADHAN_API_URL || 'https://api.aladhan.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/aladhan/, '')
        },
        '/api/quran': {
          target: env.VITE_QURAN_API_URL || 'https://api.alquran.cloud',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/quran/, '')
        },
        '/api/nominatim': {
          target: env.VITE_NOMINATIM_API_URL || 'https://nominatim.openstreetmap.org',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/nominatim/, '')
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
