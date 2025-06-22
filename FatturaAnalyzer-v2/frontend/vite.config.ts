// vite.config.ts - CONFIGURAZIONE CORRETTA per ambiente enterprise

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configurazione SWC ottimizzata per enterprise
      jsxImportSource: '@emotion/react',
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

// vite.config.ts - CONFIGURAZIONE CORRETTA per ambiente enterprise

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configurazione SWC ottimizzata per enterprise
      jsxImportSource: '@emotion/react',
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

// package.json - DEPENDENCIES CORRETTE
/*
{
  "name": "fattura-analyzer-frontend",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "@tanstack/react-query": "^5.8.4",
    "@tanstack/react-query-devtools": "^5.8.4",
    "framer-motion": "^10.16.5",
    "lucide-react": "^0.294.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-tabs": "^1.0.4",
    "sonner": "^1.2.4",
    "react-hot-toast": "^2.4.1",
    "zustand": "^4.4.7",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "recharts": "^2.8.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@types/node": "^20.9.0",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "@vitejs/plugin-react-swc": "^3.5.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.53.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.4",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2",
    "vite": "^4.5.0"
  }
}
*/

// .env.example - ENVIRONMENT VARIABLES
/*
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000

# Development
VITE_DEBUG_MODE=true
VITE_ENABLE_DEV_TOOLS=true

# Features
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_REAL_TIME=false
VITE_ENABLE_NOTIFICATIONS=true

# Version
VITE_APP_VERSION=4.0.0
VITE_BUILD_TIME=2024-06-22
*/

// tsconfig.json - TYPESCRIPT CONFIGURATION
/*
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/services/*": ["./src/services/*"],
      "@/store/*": ["./src/store/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
*/

// src/main.tsx - ENTRY POINT CORRETTO
/*
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suppress SES errors in development
if (import.meta.env.DEV) {
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('SES_UNCAUGHT_EXCEPTION')) {
      return; // Ignore SES errors
    }
    originalError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
*/

// src/App.tsx - APP COMPONENT CORRETTO
/*
import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { Toaster as HotToaster } from 'react-hot-toast';

// Components
import { FirstRunCheck } from '@/components/common/FirstRunCheck';
import { Layout } from '@/components/layout/Layout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Pages
import { HomePage } from '@/pages/HomePage';
import { ReconciliationPage } from '@/pages/ReconciliationPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { AnagraphicsPage } from '@/pages/AnagraphicsPage';
import { DashboardPage } from '@/pages/DashboardPage';

// Store & Providers
import { UIProvider } from '@/providers/UIProvider';

// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  useEffect(() => {
    console.log('🚀 Initializing FatturaAnalyzer V4.0...');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <FirstRunCheck>
          <Router>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/reconciliation" element={<ReconciliationPage />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/anagraphics" element={<AnagraphicsPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </Router>
        </FirstRunCheck>
        
        // Toast notifications
        <Toaster position="top-right" richColors />
        <HotToaster position="top-right" />
        
        // Development tools
        {import.meta.env.DEV && <ReactQueryDevtools />}
      </UIProvider>
    </QueryClientProvider>
  );
}

export default App;
*/.0",
    "@typescript-eslint/parser": "^6.10
