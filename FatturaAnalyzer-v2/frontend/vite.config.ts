// vite.config.ts - CONFIGURAZIONE CORRETTA per ambiente enterprise

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configurazione SWC ottimizzata per enterprise
      plugins: [
        // Plugin SWC per performance migliori
      ],
    }),
  ],
  
  // Risoluzione path per import alias
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    },
  },

  // Configurazione server dev
  server: {
    port: 1420,
    host: true,
    strictPort: true,
    hmr: {
      port: 1421,
    },
    // Proxy per API backend
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Build configuration enterprise
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          // Chunk splitting per performance
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          utils: ['clsx', 'tailwind-merge'],
          charts: ['recharts'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],
          animations: ['framer-motion'],
        },
      },
    },
    // Aumenta la dimensione limite per enterprise apps
    chunkSizeWarningLimit: 1000,
  },

  // Ottimizzazioni per development
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      'sonner',
      'react-hot-toast',
    ],
    exclude: [
      // Esclude pacchetti problematici
    ],
  },

  // Configurazioni aggiuntive per compatibilità
  define: {
    // Disabilita SES in development per evitare errori
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    '__DEV__': process.env.NODE_ENV === 'development',
  },

  // Configurazione CSS
  css: {
    modules: false,
    postcss: './postcss.config.js',
  },

  // Environment variables
  envPrefix: ['VITE_', 'REACT_APP_'],

  // Configurazione per problemi comuni
  esbuild: {
    logOverride: { 
      'this-is-undefined-in-esm': 'silent',
    },
    target: 'es2020',
  },

  // Worker configuration
  worker: {
    plugins: [react()],
  },
});
