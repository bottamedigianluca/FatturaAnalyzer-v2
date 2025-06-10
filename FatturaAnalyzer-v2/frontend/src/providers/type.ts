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
  };
  permissions?: string[];
  lastActive?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (prefs: Partial<User['preferences']>) => Promise<void>;
  checkSession: () => Promise<boolean>;
}

// ===== THEME TYPES =====
export type Theme = 'light' | 'dark' | 'system';

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: 'light' | 'dark';
  effectiveTheme: 'light' | 'dark';
}

// ===== SYSTEM HEALTH TYPES =====
export interface SystemHealthContextType {
  isHealthy: boolean;
  lastCheck: string | null;
  features: Record<string, boolean>;
  status: 'healthy' | 'degraded' | 'unhealthy';
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
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
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
