/**
 * Providers Index V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Export centralizzato per tutti i provider e utilities
 */

// ===== MAIN PROVIDERS WRAPPER =====
export { default as ProvidersWrapper, withProviders } from './Providers';

// ===== INDIVIDUAL PROVIDERS =====
export { AuthProvider, useAuth } from './AuthProvider';
export { ThemeProvider, useTheme } from './ThemeProvider';
export { SystemHealthProvider, useSystemHealthContext } from './SystemHealthProvider';
export { default as QueryProvider } from './QueryClientProvider';
export { ErrorBoundary, CriticalErrorBoundary } from './ErrorBoundary';

// ===== MONITORING & PERFORMANCE =====
export { PerformanceMonitor, useNetworkStatus, useQueryPerformanceMonitor } from './PerformanceMonitor';
export { SystemHealthMonitor } from './SystemHealthMonitor';

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
  SystemHealthContextType,
  HealthCheckResult,
  ErrorBoundaryState,
  ErrorBoundaryProps,
  QueryErrorType,
  QueryPerformanceMetrics,
  NotificationData,
  ProvidersWrapperProps,
  FeatureFlags
} from './types';

// ===== UTILITIES =====
export const PROVIDER_VERSION = '4.0';
export const SUPPORTED_THEMES = ['light', 'dark', 'system'] as const;
export const DEFAULT_STORAGE_KEYS = {
  theme: 'fattura-analyzer-theme-v4',
  auth: 'fattura-analyzer-auth-v4',
  preferences: 'fattura-analyzer-prefs-v4',
} as const;

// ===== PROVIDER CONFIGURATION =====
export const PROVIDER_CONFIG = {
  // Query Client defaults
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
  
  // Theme defaults
  theme: {
    defaultTheme: 'system' as const,
    storageKey: DEFAULT_STORAGE_KEYS.theme,
  },
  
  // Auth defaults
  auth: {
    tokenStorageKey: 'authToken',
    userDataStorageKey: 'userData',
    sessionCheckInterval: 30 * 60 * 1000, // 30 minutes
  },
  
  // Performance monitoring
  performance: {
    slowQueryThreshold: 5000, // 5 seconds
    criticalQueryThreshold: 10000, // 10 seconds
    healthCheckInterval: 30000, // 30 seconds
    memoryPressureThreshold: 0.8, // 80%
  },
  
  // Notifications
  notifications: {
    defaultDuration: 4000,
    position: 'top-right' as const,
  },
} as const;

// ===== DEVELOPMENT HELPERS =====
export const DEV_UTILS = process.env.NODE_ENV === 'development' ? {
  // Reset all providers
  resetProviders: () => {
    localStorage.clear();
    window.location.reload();
  },
  
  // Get current provider state
  getProviderState: () => ({
    theme: localStorage.getItem(DEFAULT_STORAGE_KEYS.theme),
    auth: {
      token: localStorage.getItem('authToken'),
      user: localStorage.getItem('userData'),
    },
    version: PROVIDER_VERSION,
  }),
  
  // Enable all features
  enableAllFeatures: () => {
    console.log('🚀 Enabling all V4.0 features...');
    // This would call the store actions
  },
  
  // Performance metrics
  getPerformanceMetrics: () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const memory = (performance as any).memory;
    
    return {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      memory: memory ? {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      } : null,
    };
  },
} : {};

// ===== SETUP FUNCTION =====
export const setupProviders = (config?: Partial<typeof PROVIDER_CONFIG>) => {
  const finalConfig = { ...PROVIDER_CONFIG, ...config };
  
  if (process.env.NODE_ENV === 'development') {
    console.log('⚙️ FatturaAnalyzer V4.0 Providers Setup:', finalConfig);
  }
  
  return finalConfig;
};

// ===== VERSION CHECK =====
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

// Auto-check version on import
checkProviderVersion();
