/**
 * Main Providers V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Wrapper principale per tutti i provider con:
 * - Ordine ottimizzato dei provider
 * - Error boundaries integrate
 * - Performance monitoring
 * - Hot reload support
 * - System health monitoring
 */

import React, { ReactNode, Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';

// Provider imports
import { ErrorBoundary, CriticalErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { SystemHealthProvider } from './SystemHealthProvider';
import { SystemHealthMonitor } from './SystemHealthMonitor';
import QueryProvider from './QueryClientProvider';

// Component imports
import { PerformanceMonitor } from './PerformanceMonitor';
import {
  LoadingSpinner,
  QueryLoadingFallback,
  AuthLoadingFallback,
  FullPageLoading
} from './LoadingComponents';

// Types
interface ProvidersWrapperProps {
  children: ReactNode;
  enableDevtools?: boolean;
  enablePerformanceMonitoring?: boolean;
}

// ===== DEVELOPMENT TOOLS =====
const DevTools = React.lazy(() => 
  import('@tanstack/react-query-devtools').then(module => ({
    default: module.ReactQueryDevtools
  })).catch(() => ({
    default: () => null // Fallback se non disponibile
  }))
);

// ===== HOT RELOAD DETECTOR =====
const HotReloadDetector: React.FC<{ children: ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 FatturaAnalyzer V4.0 - Hot Reload Active');
      
      // Reset stores on hot reload per evitare stati inconsistenti
      if (typeof module !== 'undefined' && (module as any).hot) {
        (module as any).hot.accept();
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
                
                {/* 3. System Health Provider - Monitora stato sistema PRIMA dell'auth */}
                <ErrorBoundary fallback={<LoadingSpinner />}>
                  <SystemHealthProvider>
                    
                    {/* 4. Auth Provider - Gestisce autenticazione */}
                    <ErrorBoundary fallback={<AuthLoadingFallback />}>
                      <Suspense fallback={<AuthLoadingFallback />}>
                        <AuthProvider>
                          
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
                
                {/* Dev Tools - Solo in development */}
                {enableDevtools && (
                  <Suspense fallback={null}>
                    <DevTools initialIsOpen={false} />
                  </Suspense>
                )}
                
              </QueryProvider>
            </Suspense>
          </ErrorBoundary>
         <Toaster  
        </ThemeProvider>
        
        {/* Toast Notifications - Sempre visibili */}
        
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

// Import hooks for internal usage
import { useSystemHealthContext } from './SystemHealthProvider';
import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';

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

// ===== PROVIDER HEALTH CHECK HOOK =====
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
