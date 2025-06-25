// vite.config.ts - CONFIGURAZIONE CORRETTA per ambiente enterprise

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react({
      // Configurazione SWC ottimizzata per enterprise
      plugins: [],
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
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Build configuration enterprise
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: command === 'build' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-dropdown-menu'],
          utils: ['clsx', 'tailwind-merge'],
          charts: ['recharts'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],
          animations: ['framer-motion'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          dates: ['date-fns'],
          files: ['react-dropzone', 'papaparse'],
        },
      },
    },
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
      'zustand',
      'clsx',
      'tailwind-merge',
      'recharts',
      'react-hook-form',
      'date-fns',
      'papaparse',
    ],
    exclude: [],
  },

  // Configurazioni aggiuntive per compatibilità
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
    '__DEV__': mode === 'development',
    // ✅ FIX: Disabilita service worker in development
    '__ENABLE_SERVICE_WORKER__': mode === 'production',
    // ✅ FIX: Aggiungi supporto per import.meta.env
    'import.meta.env.MODE': JSON.stringify(mode),
    'import.meta.env.DEV': mode === 'development',
    'import.meta.env.PROD': mode === 'production',
  },

  // Configurazione CSS
  css: {
    modules: false,
    postcss: './postcss.config.js',
    devSourcemap: mode === 'development',
  },

  // Environment variables
  envPrefix: ['VITE_', 'REACT_APP_'],

  // ✅ FIX: Configurazione per problemi comuni
  esbuild: {
    logOverride: { 
      'this-is-undefined-in-esm': 'silent',
    },
    target: 'es2020',
    // ✅ Migliora la gestione degli errori
    define: mode === 'development' ? {
      'process.env.NODE_ENV': '"development"'
    } : undefined,
  },

  // Worker configuration
  worker: {
    plugins: () => [react()],
  },

  // ✅ FIX: Gestione errori migliorata
  logLevel: mode === 'development' ? 'info' : 'warn',

  // ✅ FIX: Configurazione per evitare warning
  clearScreen: false,

  // ✅ FIX: Performance improvements
  ...(mode === 'development' && {
    server: {
      ...{
        port: 1420,
        host: true,
        strictPort: true,
        hmr: {
          port: 1421,
        },
        proxy: {
          '/api': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api/, '/api'),
          },
          '/health': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      // ✅ Migliora la gestione degli asset in development
      fs: {
        strict: false,
      },
    },
  }),
}));
