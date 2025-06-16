/**
 * Types V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Definizioni TypeScript centralizzate per tutti i provider
 * 
 * NOTA: Questo file sostituisce sia type.ts che types.ts per evitare duplicazioni
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
export interface HealthStatus {
  backend_healthy: boolean;
  database_connected: boolean;
  last_health_check: string | null;
  api_version?: string;
  core_integration_status?: string;
  first_run_required?: boolean;
  features?: Record<string, boolean>;
  performance_metrics?: {
    loadTime: number;
    memoryUsage?: number;
    memoryPressure?: boolean;
    api_response_time?: number;
  };
  error_count?: number;
  warning_count?: number;
}

export interface SystemHealthContextType {
  healthStatus: HealthStatus;
  isSystemHealthy: boolean;
  isLoading: boolean;
  lastCheck: string | null;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checkSystemHealth: () => Promise<void>;
  checkHealth: () => Promise<void>; // Alias per compatibilità
  systemInfo: {
    version: string;
    environment: string;
    features: string[];
  };
  retryCount: number;
  isOnline: boolean;
  errorCount: number;
  warningCount: number;
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

// ===== BUSINESS DOMAIN TYPES =====

// Anagrafiche
export interface Anagraphics {
  id: number;
  type: 'Cliente' | 'Fornitore' | 'Altro';
  business_name?: string;
  full_name?: string;
  vat_number?: string;
  tax_code?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  pec?: string;
  website?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Enhanced fields V4.0
  client_score?: number;
  payment_reliability?: number;
  total_invoiced?: number;
  last_activity?: string;
  tags?: string[];
}

export interface AnagraphicsFilters {
  search?: string;
  type_filter?: string;
  province_filter?: string;
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  // Enhanced filters V4.0
  min_client_score?: number;
  has_email?: boolean;
  has_pec?: boolean;
  activity_period?: string;
}

// Fatture
export interface Invoice {
  id: number;
  numero: string;
  data_emissione: string;
  data_scadenza?: string;
  tipo_documento: string;
  invoice_type: 'Attiva' | 'Passiva';
  anagraphics_id?: number;
  anagraphics_name?: string;
  causale?: string;
  imponibile: number;
  iva: number;
  total_amount: number;
  status_pagamento: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
  // Enhanced fields V4.0
  payment_prediction?: number;
  risk_score?: number;
  reconciliation_status?: 'Pending' | 'Partial' | 'Complete';
  ai_category?: string;
  lines?: InvoiceLine[];
}

export interface InvoiceLine {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  total_amount: number;
}

export interface InvoiceFilters {
  search?: string;
  type_filter?: 'Attiva' | 'Passiva';
  status_filter?: string;
  anagraphics_filter?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  // Enhanced filters V4.0
  payment_status?: string;
  amount_min?: number;
  amount_max?: number;
  overdue_only?: boolean;
}

// Transazioni Bancarie
export interface BankTransaction {
  id: number;
  transaction_date: string;
  value_date?: string;
  description: string;
  amount: number;
  transaction_type: 'Entrata' | 'Uscita';
  category?: string;
  bank_reference?: string;
  reconciliation_status: 'Da Riconciliare' | 'Riconciliata' | 'Parziale';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Enhanced fields V4.0
  ai_confidence?: number;
  suggested_anagraphics_id?: number;
  suggested_invoice_id?: number;
  pattern_match_score?: number;
  reconciliation_suggestions?: ReconciliationSuggestion[];
}

export interface TransactionFilters {
  search?: string;
  status_filter?: string;
  type_filter?: 'Entrata' | 'Uscita';
  category_filter?: string;
  start_date?: string;
  end_date?: string;
  amount_min?: number;
  amount_max?: number;
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  // Enhanced filters V4.0
  unreconciled_only?: boolean;
  has_suggestions?: boolean;
  ai_confidence_min?: number;
}

// Riconciliazione
export interface ReconciliationSuggestion {
  id: number;
  transaction_id: number;
  invoice_id?: number;
  anagraphics_id?: number;
  confidence_score: number;
  match_type: 'Exact' | 'Partial' | 'AI_Suggested';
  suggested_amount: number;
  reasoning?: string;
  ai_enhanced?: boolean;
}

export interface UltraReconciliationRequest {
  operation_type: 'auto' | 'manual' | 'batch';
  max_suggestions?: number;
  confidence_threshold?: number;
  enable_ai_enhancement?: boolean;
  enable_smart_patterns?: boolean;
  enable_predictive_scoring?: boolean;
  focus_anagraphics_id?: number;
  focus_date_range?: {
    start: string;
    end: string;
  };
}

export interface ManualMatchRequest {
  invoice_id: number;
  transaction_id: number;
  amount_to_match: number;
  enable_ai_validation?: boolean;
  enable_learning?: boolean;
  user_confidence?: number;
  user_notes?: string;
  force_match?: boolean;
}

export interface BatchReconciliationRequest {
  reconciliation_pairs: Array<{
    invoice_id: number;
    transaction_id: number;
    amount: number;
  }>;
  enable_ai_validation?: boolean;
  enable_parallel_processing?: boolean;
  confidence_threshold?: number;
}

// Analytics
export interface AnalyticsRequest {
  analysis_type: string;
  parameters?: Record<string, any>;
  output_format?: 'json' | 'excel' | 'pdf';
  include_ai_insights?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  enhanced_data?: Record<string, any>;
}

// Hooks Types
export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<T>;
}

export interface UseMutationResult<T, V = any> {
  mutate: (variables: V) => Promise<T>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

// Store Types
export interface CachePreferences {
  enabled: boolean;
  defaultTTL: number;
  smartInvalidation: boolean;
}

export interface PerformanceMetrics {
  api_response_times?: number[];
  cache_hit_rates?: number;
  memory_usage?: number;
  error_rates?: number;
}

// First Run Types
export interface FirstRunState {
  is_first_run: boolean;
  setup_completed: boolean;
  current_step?: string;
  wizard_data?: Record<string, any>;
}

// UI Store Types
export interface UISettings {
  theme: Theme;
  real_time_updates: boolean;
  smart_reconciliation_enabled: boolean;
  ai_features_enabled: boolean;
  performance_monitoring_enabled: boolean;
}

// Export alias types for backward compatibility
export type HealthCheckResponse = HealthCheckResult;
export type SystemStatus = SystemHealthContextType;
export type UserPreferences = User['preferences'];
export type UserProfile = User['profile'];
export type UserSettings = User['settings'];

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Event Types
export interface SystemEvent {
  type: 'health_check' | 'error' | 'warning' | 'info';
  timestamp: string;
  data: any;
  source: string;
}

// Configuration Types
export interface ProviderConfig {
  queryClient: {
    defaultOptions: {
      queries: {
        staleTime: number;
        gcTime: number;
        retry: number;
        refetchOnWindowFocus: boolean;
      };
      mutations: {
        retry: number;
      };
    };
  };
  theme: {
    defaultTheme: Theme;
    storageKey: string;
  };
  auth: {
    tokenStorageKey: string;
    userDataStorageKey: string;
    sessionCheckInterval: number;
  };
  performance: {
    slowQueryThreshold: number;
    criticalQueryThreshold: number;
    healthCheckInterval: number;
    memoryPressureThreshold: number;
  };
  notifications: {
    defaultDuration: number;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
}
