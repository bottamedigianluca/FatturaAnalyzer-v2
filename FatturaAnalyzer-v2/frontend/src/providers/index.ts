/**
 * Providers Index V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Export centralizzato per tutti i provider e utilities
 * 
 * VERSIONE CORRETTA con tutte le dipendenze risolte
 */

// ===== MAIN PROVIDERS WRAPPER =====
export { default as ProvidersWrapper, withProviders, useProvidersHealth } from './Providers';

// ===== INDIVIDUAL PROVIDERS =====
export { AuthProvider, useAuth } from './AuthProvider';
export { ThemeProvider, useTheme, useEffectiveTheme, useIsDarkTheme, useThemeColors } from './ThemeProvider';
export { 
  SystemHealthProvider, 
  useSystemHealthContext, 
  useSystemHealth // Alias per compatibilità
} from './SystemHealthProvider';
export { default as QueryProvider, queryClient } from './QueryClientProvider';
export { 
  ErrorBoundary, 
  CriticalErrorBoundary, 
  SectionErrorBoundary,
  reportError,
  useErrorHandler 
} from './ErrorBoundary';

// ===== MONITORING & PERFORMANCE =====
export { 
  PerformanceMonitor, 
  useNetworkStatus, 
  useQueryPerformanceMonitor 
} from './PerformanceMonitor';
export { 
  SystemHealthMonitor,
  HealthCheckBadge,
  PerformanceMetrics 
} from './SystemHealthMonitor';

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
  // User & Auth
  User,
  AuthContextType,
  UserPreferences,
  UserProfile,
  UserSettings,
  
  // Theme
  Theme,
  ThemeProviderProps,
  ThemeProviderState,
  ThemeColors,
  
  // System Health
  HealthStatus,
  SystemHealthContextType,
  HealthCheckResult,
  SystemEvent,
  
  // Error Boundary
  ErrorBoundaryState,
  ErrorBoundaryProps,
  
  // Query & Performance
  QueryErrorType,
  QueryPerformanceMetrics,
  PerformanceMetrics,
  
  // Notifications
  NotificationData,
  
  // Provider Configuration
  ProvidersWrapperProps,
  ProviderConfig,
  
  // Feature Flags
  FeatureFlags,
  
  // Business Domain Types
  Anagraphics,
  AnagraphicsFilters,
  Invoice,
  InvoiceFilters,
  BankTransaction,
  TransactionFilters,
  ReconciliationSuggestion,
  UltraReconciliationRequest,
  ManualMatchRequest,
  BatchReconciliationRequest,
  AnalyticsRequest,
  
  // API Types
  APIResponse,
  PaginatedResponse,
  UseApiResult,
  UseMutationResult,
  
  // Store Types
  CachePreferences,
  FirstRunState,
  UISettings,
  
  // Utility Types
  DeepPartial,
  RequiredFields,
  OptionalFields,
} from './types';

// ===== CONSTANTS & CONFIGURATION =====
export const PROVIDER_VERSION = '4.0';

export const SUPPORTED_THEMES = ['light', 'dark', 'system', 'auto'] as const;

export const DEFAULT_STORAGE_KEYS = {
  theme: 'fattura-analyzer-theme-v4',
  auth: 'fattura-analyzer-auth-v4',
  preferences: 'fattura-analyzer-prefs-v4',
  userData: 'userData',
  authToken: 'authToken',
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
    tokenStorageKey: DEFAULT_STORAGE_KEYS.authToken,
    userDataStorageKey: DEFAULT_STORAGE_KEYS.userData,
    sessionCheckInterval: 30 * 60 * 1000, // 30 minutes
  },
  
  // Performance monitoring
  performance: {
    slowQueryThreshold: 5000, // 5 seconds
    criticalQueryThreshold: 10000, // 10 seconds
    healthCheckInterval: 60000, // 60 seconds
    memoryPressureThreshold: 0.8, // 80%
  },
  
  // Notifications
  notifications: {
    defaultDuration: 4000,
    position: 'top-right' as const,
  },
  
  // System Health
  health: {
    checkInterval: 2 * 60 * 1000, // 2 minutes
    retryAttempts: 3,
    retryDelay: 1000, // Base delay for exponential backoff
  },
} as const;

// ===== UTILITY FUNCTIONS =====

/**
 * Setup function per configurazione provider
 */
export const setupProviders = (config?: Partial<typeof PROVIDER_CONFIG>) => {
  const finalConfig = { ...PROVIDER_CONFIG, ...config };
  
  if (process.env.NODE_ENV === 'development') {
    console.log('⚙️ FatturaAnalyzer V4.0 Providers Setup:', finalConfig);
  }
  
  return finalConfig;
};

/**
 * Version check e cleanup legacy data
 */
export const checkProviderVersion = () => {
  const currentVersion = PROVIDER_VERSION;
  const storedVersion = localStorage.getItem('fattura-analyzer-provider-version');
  
  if (storedVersion && storedVersion !== currentVersion) {
    console.warn(`🔄 Provider version mismatch: ${storedVersion} -> ${currentVersion}`);
    
    // Reset se versione incompatibile
    if (storedVersion < '4.0') {
      console.log('🧹 Cleaning up legacy data...');
      // Rimuovi chiavi v3.x
      const legacyKeys = [
        'fattura-analyzer-theme', // v3 key
        'fattura-analyzer-auth', // v3 key
        'fattura-analyzer-settings', // v3 key
      ];
      
      legacyKeys.forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }
  
  localStorage.setItem('fattura-analyzer-provider-version', currentVersion);
  return currentVersion;
};

/**
 * Provider health check utility
 */
export const checkProvidersHealth = () => {
  const healthChecks = {
    theme: !!localStorage.getItem(DEFAULT_STORAGE_KEYS.theme),
    auth: !!localStorage.getItem(DEFAULT_STORAGE_KEYS.authToken),
    version: localStorage.getItem('fattura-analyzer-provider-version') === PROVIDER_VERSION,
    storage: (() => {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    })(),
  };
  
  const isHealthy = Object.values(healthChecks).every(Boolean);
  
  return {
    isHealthy,
    checks: healthChecks,
    issues: Object.entries(healthChecks)
      .filter(([, healthy]) => !healthy)
      .map(([check]) => check),
  };
};

// ===== DEVELOPMENT HELPERS =====
export const DEV_UTILS = process.env.NODE_ENV === 'development' ? {
  // Reset all providers
  resetProviders: () => {
    console.log('🔄 Resetting all providers...');
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear query cache se disponibile
    if (typeof window !== 'undefined' && (window as any).__REACT_QUERY_CLIENT__) {
      (window as any).__REACT_QUERY_CLIENT__.clear();
    }
    
    // Reload page
    window.location.reload();
  },
  
  // Get current provider state
  getProviderState: () => {
    const state = {
      version: PROVIDER_VERSION,
      theme: localStorage.getItem(DEFAULT_STORAGE_KEYS.theme),
      auth: {
        token: !!localStorage.getItem(DEFAULT_STORAGE_KEYS.authToken),
        user: !!localStorage.getItem(DEFAULT_STORAGE_KEYS.userData),
      },
      health: checkProvidersHealth(),
      timestamp: new Date().toISOString(),
    };
    
    console.log('📊 Performance Metrics:', metrics);
    return metrics;
  },
  
  // Debug provider issues
  debugProviderIssues: () => {
    const health = checkProvidersHealth();
    
    if (!health.isHealthy) {
      console.error('❌ Provider Issues Detected:', health.issues);
      
      // Suggerimenti per risoluzione
      const suggestions = {
        theme: 'Try resetting theme: localStorage.removeItem("fattura-analyzer-theme-v4")',
        auth: 'Try re-login: clear auth tokens and login again',
        version: 'Try version reset: DEV_UTILS.resetProviders()',
        storage: 'Check if localStorage is available and not full',
      };
      
      health.issues.forEach(issue => {
        console.warn(`💡 ${issue}:`, suggestions[issue as keyof typeof suggestions]);
      });
    } else {
      console.log('✅ All providers healthy!');
    }
    
    return health;
  },
  
  // Simulate provider errors for testing
  simulateErrors: {
    networkError: () => {
      console.log('🔥 Simulating network error...');
      // Trigger offline event
      window.dispatchEvent(new Event('offline'));
      setTimeout(() => {
        window.dispatchEvent(new Event('online'));
        console.log('✅ Network restored');
      }, 5000);
    },
    
    authError: () => {
      console.log('🔥 Simulating auth error...');
      localStorage.removeItem(DEFAULT_STORAGE_KEYS.authToken);
      window.location.reload();
    },
    
    storageError: () => {
      console.log('🔥 Simulating storage error...');
      // Fill localStorage to trigger quota error
      try {
        for (let i = 0; i < 1000; i++) {
          localStorage.setItem(`test_${i}`, 'x'.repeat(1000));
        }
      } catch (e) {
        console.log('💥 Storage quota exceeded:', e);
      }
    },
  },
} : {};

// ===== PROVIDER VALIDATION =====

/**
 * Validates that all required providers are properly configured
 */
export const validateProviders = () => {
  const requiredProviders = [
    'ThemeProvider',
    'QueryProvider', 
    'SystemHealthProvider',
    'AuthProvider',
  ];
  
  const validationResults = requiredProviders.map(provider => {
    // Check if provider context is available
    const isAvailable = (() => {
      try {
        switch (provider) {
          case 'ThemeProvider':
            return typeof useTheme === 'function';
          case 'QueryProvider':
            return typeof queryClient === 'object';
          case 'SystemHealthProvider':
            return typeof useSystemHealthContext === 'function';
          case 'AuthProvider':
            return typeof useAuth === 'function';
          default:
            return false;
        }
      } catch {
        return false;
      }
    })();
    
    return {
      provider,
      available: isAvailable,
      status: isAvailable ? 'OK' : 'ERROR',
    };
  });
  
  const allValid = validationResults.every(result => result.available);
  
  if (process.env.NODE_ENV === 'development') {
    console.table(validationResults);
    if (allValid) {
      console.log('✅ All providers validated successfully');
    } else {
      console.error('❌ Provider validation failed');
    }
  }
  
  return {
    valid: allValid,
    results: validationResults,
    errors: validationResults.filter(r => !r.available),
  };
};

// ===== ERROR RECOVERY UTILITIES =====

/**
 * Emergency provider reset for critical errors
 */
export const emergencyReset = (options: {
  clearStorage?: boolean;
  reloadPage?: boolean;
  preserveAuth?: boolean;
} = {}) => {
  const {
    clearStorage = true,
    reloadPage = true,
    preserveAuth = false,
  } = options;
  
  console.warn('🚨 Emergency provider reset initiated');
  
  if (clearStorage) {
    if (preserveAuth) {
      const authToken = localStorage.getItem(DEFAULT_STORAGE_KEYS.authToken);
      const userData = localStorage.getItem(DEFAULT_STORAGE_KEYS.userData);
      
      localStorage.clear();
      sessionStorage.clear();
      
      if (authToken) localStorage.setItem(DEFAULT_STORAGE_KEYS.authToken, authToken);
      if (userData) localStorage.setItem(DEFAULT_STORAGE_KEYS.userData, userData);
    } else {
      localStorage.clear();
      sessionStorage.clear();
    }
  }
  
  // Reset version marker
  localStorage.setItem('fattura-analyzer-provider-version', PROVIDER_VERSION);
  
  if (reloadPage) {
    window.location.reload();
  }
};

/**
 * Safe provider initialization
 */
export const safeInitializeProviders = () => {
  try {
    // Check version compatibility
    checkProviderVersion();
    
    // Validate provider setup
    const validation = validateProviders();
    
    if (!validation.valid) {
      console.error('Provider validation failed, attempting recovery...');
      emergencyReset({ preserveAuth: true });
      return false;
    }
    
    // Check storage health
    const health = checkProvidersHealth();
    
    if (!health.isHealthy) {
      console.warn('Provider health issues detected:', health.issues);
      // Non-critical issues, continue but log
    }
    
    console.log('✅ Providers initialized successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Critical provider initialization error:', error);
    emergencyReset();
    return false;
  }
};

// ===== AUTO-INITIALIZATION =====

// Auto-check version and health on import
try {
  checkProviderVersion();
  
  if (process.env.NODE_ENV === 'development') {
    // Additional dev checks
    const health = checkProvidersHealth();
    if (!health.isHealthy) {
      console.warn('⚠️ Provider health issues:', health.issues);
    }
  }
} catch (error) {
  console.error('Provider auto-initialization failed:', error);
}

// ===== GLOBAL DEBUG SETUP =====
if (process.env.NODE_ENV === 'development') {
  // Expose debug utilities globally
  (window as any).__FATTURA_ANALYZER_PROVIDERS__ = {
    version: PROVIDER_VERSION,
    config: PROVIDER_CONFIG,
    utils: DEV_UTILS,
    validation: {
      validate: validateProviders,
      checkHealth: checkProvidersHealth,
      emergencyReset,
      safeInit: safeInitializeProviders,
    },
    constants: {
      SUPPORTED_THEMES,
      DEFAULT_STORAGE_KEYS,
    },
  };
  
  console.log('🔧 Provider debug utilities available at window.__FATTURA_ANALYZER_PROVIDERS__');
}

// ===== LEGACY COMPATIBILITY EXPORTS =====

// Re-export for backward compatibility
export { useSystemHealthContext as useHealthContext };
export { SystemHealthProvider as HealthProvider };
export { PROVIDER_CONFIG as providerConfig };
export { checkProviderVersion as checkVersion };

// Default export for convenience
export default {
  ProvidersWrapper,
  setupProviders,
  validateProviders,
  checkProvidersHealth,
  PROVIDER_VERSION,
  PROVIDER_CONFIG,
};
  },
  
  // Enable all features
  enableAllFeatures: () => {
    console.log('🚀 Enabling all V4.0 features...');
    
    const features = {
      aiFeatures: true,
      smartReconciliation: true,
      advancedAnalytics: true,
      realTimeUpdates: true,
      performanceMonitoring: true,
    };
    
    localStorage.setItem('v4-features', JSON.stringify(features));
    console.log('✅ All features enabled:', features);
  },
  
  // Performance metrics
  getPerformanceMetrics: () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const memory = (performance as any).memory;
    
    const metrics = {
      loadTime: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
      domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
      memory: memory ? {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      } : null,
      timestamp: new Date().toISO
