// frontend/vite.config.ts

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carica le variabili d'ambiente in modo sicuro
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isDevelopment = !isProduction;

  return {
    // Sezione dei Plugin
    plugins: [
      react({
        // Configurazione per usare Emotion.js (libreria di stile)
        // Plugin per SWC (il compilatore veloce usato da Vite)
        plugins: [
          [
            '@swc/plugin-styled-components',
            {
              displayName: isDevelopment, // Nomi classe leggibili in sviluppo
              ssr: false,
            },
          ],
        ],
      }),
      // Configurazione per Progressive Web App (PWA)
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'FatturaAnalyzer v2',
          short_name: 'FatturaAnalyzer',
          description: 'Gestione finanziaria e analisi di business per aziende italiane.',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // Cache di tutti gli asset principali
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
        },
        devOptions: {
          enabled: false, // Abilita PWA anche in sviluppo per test
        },
      }),
    ],

    // Configurazione del server di sviluppo
    server: {
      port: 1420,
      strictPort: true,
      // Configurazione CORS per permettere al frontend di comunicare col backend
      cors: {
        origin: ['http://localhost:8000', 'http://127.0.0.1:8000'],
        credentials: true,
      },
      watch: {
        usePolling: false,
      },
    },
    
    // Configurazione del server di anteprima (dopo la build)
    preview: {
      port: 1420,
      strictPort: true,
      host: true,
      cors: true,
    },

    // Alias per i percorsi, per import più puliti
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // Prefisso per le variabili d'ambiente
    envPrefix: ['VITE_', 'TAURI_'],

    // Inietta variabili globali nell'applicazione
    define: {
      __APP_VERSION__: JSON.stringify('4.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      // Feature flags per abilitare/disabilitare funzionalità dinamicamente
      __FEATURES_V4__: JSON.stringify({
        AI_ANALYTICS: true,
        SMART_RECONCILIATION: true,
        REAL_TIME_UPDATES: true,
        ENHANCED_TRANSACTIONS: true,
        CLOUD_SYNC: true,
        PWA_SUPPORT: true,
      }),
    },

    // Ottimizzazioni delle dipendenze per Vite
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'zustand',
        'recharts',
        'date-fns',
        'lucide-react',
      ],
      exclude: ['@tauri-apps/api'],
    },

    // Configurazione CSS
    css: {
      // Non è più necessaria la sezione `postcss` qui,
      // Vite userà automaticamente il file `postcss.config.js`
      preprocessorOptions: {
        scss: {
          // Esempio per importare variabili SASS globalmente
          // additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },

    // Configurazione per la build di produzione
    build: {
      outDir: 'dist',
      sourcemap: isDevelopment, // Genera sourcemap solo in sviluppo
      rollupOptions: {
        output: {
          manualChunks: {
            // Separa le librerie più grandi in chunk diversi per un caricamento più veloce
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            ui: ['@radix-ui/react-slot', 'lucide-react', 'tailwind-merge'],
          },
        },
      },
    },
    
    esbuild: {
      // Rimuove `console.log` e `debugger` solo in produzione
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    
    // Configurazione per i Web Worker
    worker: {
      format: 'es',
      plugins: [react()], // Fornisce direttamente l'array, non una funzione
    },

    clearScreen: false,
  };
});
