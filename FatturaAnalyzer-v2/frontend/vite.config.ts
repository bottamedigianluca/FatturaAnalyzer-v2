/**
 * Vite Configuration V4.0 Ultra-Enhanced
 * Ottimizzato per performance, bundle size e developer experience
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// V4.0 Enhanced Vite Configuration
export default defineConfig(({ command, mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  return {
    // V4.0 Enhanced Plugins
    plugins: [
      // React with SWC for faster builds
      react({
        // V4.0 SWC Configuration
        jsxImportSource: '@emotion/react',
        plugins: [
          // React Refresh for better HMR
          ['@swc/plugin-styled-components', {
            displayName: isDevelopment,
            ssr: false,
          }],
        ],
      }),

      // V4.0 PWA Configuration
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\./,
              handler: 'CacheFirst',
              options: {
                cacheName: 'api-cache-v4',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheKeyWillBeUsed: async ({ request }) => {
                  return `${request.url}?v=4.0`;
                },
              },
            },
          ],
        },
        manifest: {
          name: 'FatturaAnalyzer V4.0 Ultra-Enhanced',
          short_name: 'FatturaAnalyzer V4',
          description: 'AI-Powered Invoice Management with Smart Reconciliation',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        devOptions: {
          enabled: isDevelopment,
          type: 'module',
        },
      }),
    ],

    // V4.0 Enhanced Build Configuration
    build: {
      // Modern target for better performance
      target: 'esnext',
      
      // V4.0 Rollup Options for Optimal Bundle
      rollupOptions: {
        output: {
          // Code splitting for better caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              'lucide-react',
            ],
            'query-vendor': ['@tanstack/react-query', 'zustand'],
            'chart-vendor': ['recharts', 'd3', 'chart.js'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'date-vendor': ['date-fns'],
            'file-vendor': ['papaparse', 'xlsx', 'file-saver'],
            'utils-vendor': ['lodash', 'clsx', 'tailwind-merge'],
            
            // V4.0 Feature chunks
            'ai-features': [
              // AI-related modules would go here
            ],
            'reconciliation-features': [
              // Smart reconciliation modules
            ],
            'analytics-features': [
              // Analytics V3.0 modules
            ],
          },
          
          // V4.0 Enhanced chunk naming
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop().replace('.tsx', '').replace('.ts', '')
              : 'chunk';
            return `js/[name]-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
        
        // V4.0 External dependencies (if using CDN)
        external: isProduction ? [] : [],
      },
      
      // V4.0 Build optimizations
      minify: isProduction ? 'esbuild' : false,
      sourcemap: isDevelopment ? 'inline' : false,
      
      // V4.0 Asset optimization
      assetsInlineLimit: 4096,
      
      // V4.0 CSS code splitting
      cssCodeSplit: true,
      
      // V4.0 Enhanced warnings
      reportCompressedSize: isProduction,
      chunkSizeWarningLimit: 1000,
    },

    // V4.0 Enhanced Development Server
    server: {
      port: 1420,
      strictPort: true,
      host: true, // Allow external connections
      
      // V4.0 HMR Configuration
      hmr: {
        overlay: true,
        port: 1421,
      },
      
      // V4.0 Proxy for API calls
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('🔌 Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('📡 Proxying request:', req.method, req.url);
            });
          },
        },
      },
      
      // V4.0 Watch configuration
      watch: {
        ignored: [
          '**/src-tauri/**',
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
        ],
        usePolling: false,
      },
      
      // V4.0 CORS configuration
      cors: {
        origin: ['http://localhost:1420', 'http://127.0.0.1:1420'],
        credentials: true,
      },
    },

    // V4.0 Enhanced Preview Server
    preview: {
      port: 1420,
      strictPort: true,
      host: true,
      cors: true,
    },

    // V4.0 Path Resolution
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
        '@/styles': path.resolve(__dirname, './src/styles'),
        '@/assets': path.resolve(__dirname, './src/assets'),
      },
    },

    // V4.0 Environment Variables
    envPrefix: ['VITE_', 'TAURI_'],
    
    // V4.0 Define global constants
    define: {
      __APP_VERSION__: JSON.stringify('4.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __FEATURES_V4__: JSON.stringify({
        AI_ANALYTICS: true,
        SMART_RECONCILIATION: true,
        REAL_TIME_UPDATES: true,
        ENHANCED_TRANSACTIONS: true,
        CLOUD_SYNC: true,
        PWA_SUPPORT: true,
      }),
    },

    // V4.0 Dependency Optimization
    optimizeDeps: {
      include: [
        // Pre-bundle heavy dependencies
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'zustand',
        'recharts',
        'date-fns',
        'lodash',
        'lucide-react',
      ],
      exclude: [
        // Don't pre-bundle these
        '@tauri-apps/api',
      ],
    },

    // V4.0 CSS Configuration
    css: {
      // V4.0 CSS Modules
      modules: {
        localsConvention: 'camelCaseOnly',
        generateScopedName: isDevelopment 
          ? '[name]__[local]___[hash:base64:5]'
          : '[hash:base64:8]',
      },
      
      // V4.0 Preprocessor options
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },

    // V4.0 Performance Configuration
    esbuild: {
      // Remove console logs in production
      drop: isProduction ? ['console', 'debugger'] : [],
      
      // V4.0 JSX configuration
      jsx: 'automatic',
      jsxDev: isDevelopment,
      
      // V4.0 Legal comments
      legalComments: 'none',
    },

    // V4.0 Clear screen for better development experience
    clearScreen: false,

    // V4.0 Log level
    logLevel: isDevelopment ? 'info' : 'warn',

    // V4.0 Worker configuration
    worker: {
      format: 'es',
      plugins: () => [react()],
    },
  };
});
