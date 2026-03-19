import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [tailwindcss(), react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('framer-motion')) return 'animations';
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-core';
              if (id.includes('@supabase')) return 'supabase';
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
