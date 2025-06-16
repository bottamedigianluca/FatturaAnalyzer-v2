/**
 * Providers Index V4.0 - Fix Immediato per Errore di Sintassi
 * Export centralizzato per tutti i provider e utilities
 */

// ===== MAIN PROVIDERS WRAPPER =====
export { default as ProvidersWrapper } from './Providers';

// ===== INDIVIDUAL PROVIDERS =====
export { AuthProvider, useAuth } from './AuthProvider';
export { ThemeProvider, useTheme } from './ThemeProvider';
export { SystemHealthProvider, useSystemHealthContext } from './SystemHealthProvider';
export { default as QueryProvider } from './QueryClientProvider';
export { ErrorBoundary, CriticalErrorBoundary } from './ErrorBoundary';

// ===== MONITORING & PERFORMANCE =====
export { PerformanceMonitor } from './PerformanceMonitor';

// ===== LOADING COMPONENTS =====
export {
  LoadingSpinner,
  QueryLoadingFallback,
  AuthLoadingFallback,
  FeatureLoadingFallback,
  SkeletonLoader,
  TableSkeleton,
  CardSkeleton,
  DashboardSkeleton,
  FullPageLoading
} from './LoadingComponents';

// ===== TYPES =====
export type {
  User,
  AuthContextType,
  Theme,
  ThemeProviderProps,
  ThemeProviderState,
  ThemeColors,
  HealthStatus,
  SystemHealthContextType,
  HealthCheckResult,
  ErrorBoundaryState,
  ErrorBoundaryProps,
  QueryErrorType,
  QueryPerformanceMetrics,
  NotificationData,
  ProvidersWrapperProps,
  FeatureFlags,
} from './types';

// ===== CONSTANTS =====
export const PROVIDER_VERSION = '4.0';
export const SUPPORTED_THEMES = ['light', 'dark', 'system', 'auto'] as const;

export const DEFAULT_STORAGE_KEYS = {
  theme: 'fattura-analyzer-theme-v4',
  auth: 'fattura-analyzer-auth-v4',
  preferences: 'fattura-analyzer-prefs-v4',
  userData: 'userData',
  authToken: 'authToken',
} as const;

// ===== BASIC CONFIGURATION =====
export const PROVIDER_CONFIG = {
  queryClient: {
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  },
  theme: {
    defaultTheme: 'system' as const,
    storageKey: DEFAULT_STORAGE_KEYS.theme,
  },
  auth: {
    tokenStorageKey: DEFAULT_STORAGE_KEYS.authToken,
    userDataStorageKey: DEFAULT_STORAGE_KEYS.userData,
    sessionCheckInterval: 30 * 60 * 1000, // 30 minutes
  },
} as const;

// ===== UTILITY FUNCTIONS =====
export const checkProviderVersion = () => {
  const currentVersion = PROVIDER_VERSION;
  const storedVersion = localStorage.getItem('fattura-analyzer-provider-version');
  
  if (storedVersion && storedVersion !== currentVersion) {
    console.warn(`🔄 Provider version mismatch: ${storedVersion} -> ${currentVersion}`);
    
    // Reset se versione incompatibile
    if (storedVersion < '4.0') {
      console.log('🧹 Cleaning up legacy data...');
      localStorage.removeItem('fattura-analyzer-theme'); // v3 key
      localStorage.removeItem('fattura-analyzer-auth'); // v3 key
    }
  }
  
  localStorage.setItem('fattura-analyzer-provider-version', currentVersion);
  return currentVersion;
};

// ===== DEBUG UTILITIES (DEV ONLY) =====
if (process.env.NODE_ENV === 'development') {
  (window as any).__FATTURA_ANALYZER_PROVIDERS__ = {
    version: PROVIDER_VERSION,
    config: PROVIDER_CONFIG,
    checkVersion: checkProviderVersion,
    reset: () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };
  
  console.log('🚀 FatturaAnalyzer V4.0 Providers Initialized');
  console.log('🔧 Debug utilities available at window.__FATTURA_ANALYZER_PROVIDERS__');
}

// Auto-check version on import
checkProviderVersion();
