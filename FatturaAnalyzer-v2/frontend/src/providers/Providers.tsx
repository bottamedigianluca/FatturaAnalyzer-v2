/**
 * Main Providers V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Wrapper principale per tutti i provider con:
 * - Ordine ottimizzato dei provider
 * - Error boundaries integrate
 * - Performance monitoring
 * - Hot reload support
 */

import React, { ReactNode, Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';

// Provider imports
import { ErrorBoundary, CriticalErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { SystemHealthProvider } from './SystemHealthProvider';
import QueryProvider from './QueryClientProvider';

// Component imports
import { PerformanceMonitor } from './PerformanceMonitor';
import { SystemHealthMonitor } from './SystemHealthMonitor';
import {
  LoadingSpinner,
  QueryLoadingFallback,
  AuthLoadingFallback,
  FullPageLoading
} from './LoadingComponents';

// Types
import { ProvidersWrapperProps } from './types';

// ===== DEVELOPMENT TOOLS =====
const DevTools = React.lazy(() => 
  import('@tanstack/react-query-devtools').then(module => ({
    default: module.ReactQueryDevtools
  }))
);

// ===== HOT RELOAD DETECTOR =====
const HotReloadDetector: React.FC<{ children: ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 FatturaAnalyzer V4.0 - Hot Reload Active');
      
      // Reset stores on hot reload per evitare stati inconsistenti
      if (module.hot) {
        module.hot.accept();
      }
    }
  }, []);
  
  return <>{children}</>;
};

// ===== PROVIDERS WRAPPER PRINCIPALE =====
export const ProvidersWrapper: React.FC<ProvidersWrapperProps> = ({
  children,
  enableDevtools = process.env.NODE_ENV === 'development',
  enablePerformanceMonitoring = true,
}) => {
  return (
    <CriticalErrorBoundary>
      <HotReloadDetector>
        
        {/* 1. Theme Provider - Deve essere il primo per applicare temi */}
        <ThemeProvider defaultTheme="system" storageKey="fattura-analyzer-theme-v4">
          
          {/* 2. Query Client Provider - Gestisce tutte le chiamate API */}
          <ErrorBoundary fallback={<QueryLoadingFallback />}>
            <Suspense fallback={<QueryLoadingFallback />}>
              <QueryProvider>
                
                {/* 3. Auth Provider - Gestisce autenticazione */}
                <ErrorBoundary fallback={<AuthLoadingFallback />}>
                  <Suspense fallback={<AuthLoadingFallback />}>
                    <AuthProvider>
                      
                      {/* 4. System Health Provider - Monitora stato sistema */}
                      <ErrorBoundary fallback={<LoadingSpinner />}>
                        <SystemHealthProvider>
                          
                          {/* 5. Performance Monitor - Se abilitato */}
                          {enablePerformanceMonitoring ? (
                            <PerformanceMonitor>
                              <SystemHealthMonitor>
                                
                                {/* 6. Main App Content */}
                                <ErrorBoundary>
                                  <Suspense fallback={<FullPageLoading message="Inizializzazione completata..." />}>
                                    {children}
                                  </Suspense>
                                </ErrorBoundary>
                                
                              </SystemHealthMonitor>
                            </PerformanceMonitor>
                          ) : (
                            <ErrorBoundary>
                              <Suspense fallback={<FullPageLoading message="Caricamento applicazione..." />}>
                                {children}
                              </Suspense>
                            </ErrorBoundary>
                          )}
                          
                        </SystemHealthProvider>
                      </ErrorBoundary>
                      
                    </AuthProvider>
                  </Suspense>
                </ErrorBoundary>
                
                {/* Dev Tools - Solo in development */}
                {enableDevtools && (
                  <Suspense fallback={null}>
                    <DevTools initialIsOpen={false} />
                  </Suspense>
                )}
                
              </QueryProvider>
            </Suspense>
          </ErrorBoundary>
          
        </ThemeProvider>
        
        {/* Toast Notifications - Sempre visibili */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'toast-custom',
          }}
        />
        
      </HotReloadDetector>
    </CriticalErrorBoundary>
  );
};

// ===== EXPORT DEFAULT =====
export default ProvidersWrapper;

// ===== ADDITIONAL EXPORTS =====
export { useAuth } from './AuthProvider';
export { useTheme } from './ThemeProvider';
export { useSystemHealthContext } from './SystemHealthProvider';
export { useNetworkStatus, useQueryPerformanceMonitor } from './PerformanceMonitor';

// ===== PROVIDER UTILITIES =====
export const withProviders = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { enableDevtools?: boolean; enablePerformanceMonitoring?: boolean }> => {
  return ({ enableDevtools, enablePerformanceMonitoring, ...props }) => (
    <ProvidersWrapper 
      enableDevtools={enableDevtools}
      enablePerformanceMonitoring={enablePerformanceMonitoring}
    >
      <Component {...(props as P)} />
    </ProvidersWrapper>
  );
};

// ===== DEBUG UTILITIES =====
if (process.env.NODE_ENV === 'development') {
  // Debug globale per provider
  (window as any).__FATTURA_ANALYZER_DEBUG__ = {
    version: '4.0',
    providers: {
      auth: 'AuthProvider',
      theme: 'ThemeProvider',
      query: 'QueryProvider',
      health: 'SystemHealthProvider',
    },
    features: {
      hotReload: true,
      devtools: true,
      performanceMonitoring: true,
    }
  };
  
  console.log('🚀 FatturaAnalyzer V4.0 Providers Initialized');
  console.log('📊 Debug info available at window.__FATTURA_ANALYZER_DEBUG__');
}
