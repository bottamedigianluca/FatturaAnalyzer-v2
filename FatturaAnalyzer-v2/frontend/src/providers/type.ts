/**
 * Types V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Definizioni TypeScript centralizzate per tutti i provider
 */

import { ReactNode } from 'react';

// ===== USER & AUTH TYPES =====
export interface User {
  id: string;
  username: string;
  email?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    aiFeatures?: boolean;
    notifications?: boolean;
    smartReconciliation?: boolean;
    realTimeUpdates?: boolean;
  };
  permissions?: string[];
  lastActive?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    role?: string;
    avatar?: string;
  };
  settings?: {
    dashboardLayout?: string;
    defaultView?: string;
    autoSave?: boolean;
    analyticsLevel?: 'basic' | 'standard' | 'advanced';
  };
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (prefs: Partial<User['preferences']>) => Promise<void>;
  updateProfile: (profile: Partial<User['profile']>) => Promise<void>;
  updateSettings: (settings: Partial<User['settings']>) => Promise<void>;
  checkSession: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

// ===== THEME TYPES =====
export type Theme = 'light' | 'dark' | 'system' | 'auto';

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableTransitions?: boolean;
  respectMotionPreferences?: boolean;
}

export interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: 'light' | 'dark';
  effectiveTheme: 'light' | 'dark';
  isSystemTheme: boolean;
  toggleTheme: () => void;
  cycleTheme: () => void;
  applyTheme: (theme: 'light' | 'dark') => void;
  getThemeColors: () => ThemeColors;
  supportsSystemTheme: boolean;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  destructive: string;
  warning: string;
  success: string;
  info: string;
}

// ===== SYSTEM HEALTH TYPES =====
export interface SystemHealthContextType {
  isHealthy: boolean;
  lastCheck: string | null;
  features: Record<string, boolean>;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checkHealth: () => Promise<void>;
  systemInfo: {
    version: string;
    environment: string;
    features: string[];
  };
}

export interface HealthCheckResult {
  backend_healthy: boolean;
  last_health_check: string;
  user_authenticated: boolean;
  performance_metrics?: {
    loadTime: number;
    memoryUsage?: number;
    memoryPressure?: boolean;
  };
}

// ===== ERROR BOUNDARY TYPES =====
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
  retryCount: number;
  lastErrorTime?: number;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  resetTimeoutMs?: number;
  isolate?: boolean;
  reportErrors?: boolean;
}

// ===== QUERY CLIENT TYPES =====
export interface QueryErrorType {
  message: string;
  status?: number;
  code?: string;
}

export interface QueryPerformanceMetrics {
  queryCount: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
}

// ===== NOTIFICATION TYPES =====
export interface NotificationData {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// ===== PROVIDER WRAPPER TYPES =====
export interface ProvidersWrapperProps {
  children: ReactNode;
  enableDevtools?: boolean;
  enablePerformanceMonitoring?: boolean;
}

// ===== FEATURE FLAGS TYPES =====
export interface FeatureFlags {
  aiFeatures: boolean;
  smartReconciliation: boolean;
  advancedAnalytics: boolean;
  realTimeUpdates: boolean;
  performanceMonitoring: boolean;
}
