import React, { ReactNode, Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary, CriticalErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { SystemHealthProvider } from './SystemHealthProvider';
import { SystemHealthMonitor } from './SystemHealthMonitor';
import QueryProvider from './QueryClientProvider';
import { PerformanceMonitor } from './PerformanceMonitor';
import {
  LoadingSpinner,
  QueryLoadingFallback,
  AuthLoadingFallback,
  FullPageLoading
} from './LoadingComponents';

interface ProvidersWrapperProps {
  children: ReactNode;
  enableDevtools?: boolean;
  enablePerformanceMonitoring?: boolean;
}

const DevTools = React.lazy(() => 
  import('@tanstack/react-query-devtools').then(module => ({
    default: module.ReactQueryDevtools
  })).catch(() => ({
    default: () => null 
  }))
);

const HotReloadDetector: React.FC<{ children: ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 FatturaAnalyzer V4.0 - Hot Reload Active');
      if (typeof module !== 'undefined' && (module as any).hot) {
        (module as any).hot.accept();
      }
    }
  }, []);

  return <>{children}</>;
};

export const ProvidersWrapper: React.FC<ProvidersWrapperProps> = ({
  children,
  enableDevtools = process.env.NODE_ENV === 'development',
  enablePerformanceMonitoring = true,
}) => {
  return (
    <CriticalErrorBoundary>
      <HotReloadDetector>
        {}
        <ThemeProvider defaultTheme="system" storageKey="fattura-analyzer-theme-v4">
          {}
          <ErrorBoundary fallback={<QueryLoadingFallback />}>
            <Suspense fallback={<QueryLoadingFallback />}>
              <QueryProvider>
                {}
                <ErrorBoundary fallback={<LoadingSpinner />}>
                  <SystemHealthProvider>
                    {}
                    <ErrorBoundary fallback={<AuthLoadingFallback />}>
                      <Suspense fallback={<AuthLoadingFallback />}>
                        <AuthProvider>
                          {}
                          {enablePerformanceMonitoring ? (
                            <PerformanceMonitor>
                              <SystemHealthMonitor>
                                {}
                                <ErrorBoundary>
                                  <Suspense fallback={<FullPageLoading message="Inizializzazione completata..." />}>
                                    {children}
                                  </Suspense>
                                </ErrorBoundary>
                              </SystemHealthMonitor>
                            </PerformanceMonitor>
                          ) : (
                            <SystemHealthMonitor>
                              <ErrorBoundary>
                                <Suspense fallback={<FullPageLoading message="Caricamento applicazione..." />}>
                                  {children}
                                </Suspense>
                              </ErrorBoundary>
                            </SystemHealthMonitor>
                          )}
                        </AuthProvider>
                      </Suspense>
                    </ErrorBoundary>
                  </SystemHealthProvider>
                </ErrorBoundary>
                {}
                {enableDevtools && (
                  <Suspense fallback={null}>
                    <DevTools initialIsOpen={false} />
                  </Suspense>
                )}
              </QueryProvider>
            </Suspense>
          </ErrorBoundary>
          
          {/* ======================= INIZIO MODIFICA CORRETTIVA ======================= */}
          {/* Il componente Toaster è stato spostato qui DENTRO il ThemeProvider      */}
          {/* per risolvere l'errore 'useTheme must be used within a ThemeProvider'. */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'toast-custom',
            }}
          />
          {/* ======================== FINE MODIFICA CORRETTIVA ======================== */}
          
        </ThemeProvider>
        {/*
          <Toaster /> è stato rimosso da qui.
        */}
      </HotReloadDetector>
    </CriticalErrorBoundary>
  );
};

export default ProvidersWrapper;

export { useAuth } from './AuthProvider';
export { useTheme } from './ThemeProvider';
export { useSystemHealthContext } from './SystemHealthProvider';
export { useNetworkStatus, useQueryPerformanceMonitor } from './PerformanceMonitor';

import { useSystemHealthContext } from './SystemHealthProvider';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

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

export const useProvidersHealth = () => {
  const { isSystemHealthy } = useSystemHealthContext();
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  return {
    allHealthy: isSystemHealthy && isAuthenticated,
    systemHealth: isSystemHealthy,
    authStatus: isAuthenticated ? 'authenticated' : 'unauthenticated',
    themeStatus: theme,
    providersReady: true,
  };
};

if (process.env.NODE_ENV === 'development') {
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
      healthMonitoring: true,
    },
    utils: {
      checkHealth: () => {
        const healthContext = document.querySelector('[data-provider="health"]');
        console.log('Health Provider Status:', healthContext);
      },
      resetProviders: () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      },
      getProviderState: () => ({
        theme: localStorage.getItem('fattura-analyzer-theme-v4'),
        auth: {
          token: localStorage.getItem('authToken'),
          user: localStorage.getItem('userData'),
        },
        version: '4.0',
      }),
    }
  };
  console.log('🚀 FatturaAnalyzer V4.0 Providers Initialized');
  console.log('📊 Debug info available at window.__FATTURA_ANALYZER_DEBUG__');
  console.log('🔧 Available debug commands:', Object.keys((window as any).__FATTURA_ANALYZER_DEBUG__.utils));
}
