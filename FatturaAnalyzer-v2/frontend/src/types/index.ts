/**
 * Types V4.0 Ultra-Enhanced for FatturaAnalyzer - COMPLETE & FIXED
 * Definizioni TypeScript centralizzate per tutti i componenti
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

export interface NotificationConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
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
  // Additional fields for compatibility
  doc_number?: string;
  doc_date?: string;
  due_date?: string;
  counterparty_name?: string;
  payment_status?: string;
  open_amount?: number;
  days_overdue?: number;
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
  // Additional fields for compatibility
  remaining_amount?: number;
}

/**
 * Transaction Filters Interface - VERSIONE CORRETTA
 * Allineata esattamente con parametri supportati dal backend
 * 
 * Aggiungere a: frontend/src/types/index.ts o creare nuovo file
 */

// ===== INTERFACE CORRETTA PER TRANSACTION FILTERS =====

export interface TransactionFilters {
  // ✅ PARAMETRI BASE SUPPORTATI DAL BACKEND
  status_filter?: string; // 'Da Riconciliare' | 'Riconciliato Parz.' | 'Riconciliato Tot.' | 'Ignorato'
  search?: string;
  start_date?: string; // ISO format YYYY-MM-DD
  end_date?: string;   // ISO format YYYY-MM-DD
  min_amount?: number;
  max_amount?: number;
  anagraphics_id_heuristic?: number;
  
  // ✅ FILTRI BOOLEAN SUPPORTATI
  hide_pos?: boolean;
  hide_worldline?: boolean;
  hide_cash?: boolean;
  hide_commissions?: boolean;
  
  // ✅ PAGINAZIONE SUPPORTATA
  page?: number;
  size?: number;
  
  // ===== BACKWARD COMPATIBILITY =====
  // Mantieni per compatibilità con codice esistente ma NON inviare al backend
  reconciliation_status?: string; // Alias per status_filter
  limit?: number; // Alias per size
  offset?: number; // Calcolato da page/size
}

// ===== ENUM PER STATI RICONCILIAZIONE =====

export enum ReconciliationStatus {
  DA_RICONCILIARE = "Da Riconciliare",
  RICONCILIATO_PARZ = "Riconciliato Parz.",
  RICONCILIATO_TOT = "Riconciliato Tot.",
  RICONCILIATO_ECCESSO = "Riconciliato Eccesso",
  IGNORATO = "Ignorato"
}

// ===== UTILITY FUNCTIONS =====

/**
 * Pulisce i filtri per il backend rimuovendo parametri non supportati
 */
export function cleanTransactionFilters(filters: TransactionFilters): Record<string, any> {
  return {
    status_filter: filters.status_filter || filters.reconciliation_status,
    search: filters.search,
    start_date: filters.start_date,
    end_date: filters.end_date,
    min_amount: filters.min_amount,
    max_amount: filters.max_amount,
    anagraphics_id_heuristic: filters.anagraphics_id_heuristic,
    hide_pos: filters.hide_pos || false,
    hide_worldline: filters.hide_worldline || false,
    hide_cash: filters.hide_cash || false,
    hide_commissions: filters.hide_commissions || false,
    page: filters.page || 1,
    size: filters.size || filters.limit || 50
  };
}

/**
 * Valida i filtri prima dell'invio
 */
export function validateTransactionFilters(filters: TransactionFilters): string[] {
  const errors: string[] = [];
  
  if (filters.start_date && filters.end_date) {
    const start = new Date(filters.start_date);
    const end = new Date(filters.end_date);
    if (start > end) {
      errors.push('Data inizio deve essere precedente alla data fine');
    }
  }
  
  if (filters.min_amount && filters.max_amount && filters.min_amount > filters.max_amount) {
    errors.push('Importo minimo deve essere inferiore all\'importo massimo');
  }
  
  if (filters.page && filters.page < 1) {
    errors.push('Numero pagina deve essere maggiore di 0');
  }
  
  if (filters.size && (filters.size < 1 || filters.size > 1000)) {
    errors.push('Dimensione pagina deve essere tra 1 e 1000');
  }
  
  return errors;
}

// ===== CONSTANTI =====

export const RECONCILIATION_STATUS_OPTIONS = [
  { value: ReconciliationStatus.DA_RICONCILIARE, label: 'Da Riconciliare' },
  { value: ReconciliationStatus.RICONCILIATO_PARZ, label: 'Riconciliato Parzialmente' },
  { value: ReconciliationStatus.RICONCILIATO_TOT, label: 'Riconciliato Totalmente' },
  { value: ReconciliationStatus.IGNORATO, label: 'Ignorato' }
];

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  page: 1,
  size: 50,
  hide_pos: false,
  hide_worldline: false,
  hide_cash: false,
  hide_commissions: false
};

export const MAX_SEARCH_LENGTH = 200;
export const MIN_SEARCH_LENGTH = 2;
export const MAX_PAGE_SIZE = 1000;
export const DEFAULT_PAGE_SIZE = 50;

// ===== TYPE GUARDS =====

export function isValidReconciliationStatus(status: string): status is ReconciliationStatus {
  return Object.values(ReconciliationStatus).includes(status as ReconciliationStatus);
}

export function isValidTransactionFilter(key: string): key is keyof TransactionFilters {
  const validKeys: (keyof TransactionFilters)[] = [
    'status_filter', 'search', 'start_date', 'end_date', 'min_amount', 'max_amount',
    'anagraphics_id_heuristic', 'hide_pos', 'hide_worldline', 'hide_cash', 
    'hide_commissions', 'page', 'size', 'reconciliation_status', 'limit', 'offset'
  ];
  return validKeys.includes(key as keyof TransactionFilters);
}

// ===== HELPER FOR DEBUG =====

export function debugTransactionFilters(filters: TransactionFilters): void {
  if (process.env.NODE_ENV === 'development') {
    console.group('🔍 Transaction Filters Debug');
    console.log('Original filters:', filters);
    console.log('Cleaned filters:', cleanTransactionFilters(filters));
    console.log('Validation errors:', validateTransactionFilters(filters));
    console.groupEnd();
  }
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

// Badge Variant Types per UI
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'error' | 'info';

// Payment Status Helper
export interface PaymentStatusInfo {
  label: string;
  variant: BadgeVariant;
  icon?: string;
}

// Dashboard KPI Types
export interface KPIData {
  total_receivables: number;
  total_payables: number;
  overdue_receivables_count: number;
  overdue_receivables_amount: number;
  overdue_payables_count: number;
  overdue_payables_amount: number;
  revenue_ytd: number;
  revenue_prev_year_ytd: number;
  revenue_yoy_change_ytd?: number;
  gross_margin_ytd: number;
  margin_percent_ytd?: number;
  active_customers_month: number;
  new_customers_month: number;
}

export interface DashboardData {
  kpis: KPIData;
  recent_invoices: Array<{
    id: number;
    type: string;
    doc_number: string;
    doc_date: string;
    total_amount: number;
    payment_status: string;
    counterparty_name: string;
    open_amount: number;
  }>;
  recent_transactions: Array<{
    id: number;
    transaction_date: string;
    amount: number;
    description: string;
    reconciliation_status: string;
    remaining_amount: number;
  }>;
  cash_flow_summary: Array<{
    month: string;
    total_inflows: number;
    total_outflows: number;
    net_cash_flow: number;
  }>;
  top_clients: Array<{
    id: number;
    denomination: string;
    total_revenue: number;
    num_invoices: number;
    last_order_date: string;
  }>;
  overdue_invoices: Array<{
    id: number;
    doc_number: string;
    doc_date: string;
    due_date: string;
    total_amount: number;
    open_amount: number;
    days_overdue: number;
    counterparty_name: string;
  }>;
}

// Loading Component Types
export interface LoadingComponentProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Form Types
export interface FormFieldProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

// Table Types
export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (item: T) => void;
  className?: string;
}

// Sidebar Types
export interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
  children?: NavigationItem[];
}

// Filter Types
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'daterange' | 'number';
  options?: FilterOption[];
  min?: number;
  max?: number;
}

// Export everything needed for the application
export default {};

// Export common type unions
export type InvoiceType = 'Attiva' | 'Passiva';
export type TransactionType = 'Entrata' | 'Uscita';
export type ReconciliationStatus = 'Da Riconciliare' | 'Riconciliata' | 'Parziale';
export type PaymentStatus = 'Pagata' | 'Non pagata' | 'Parziale' | 'Scaduta';
export type AnagraphicsType = 'Cliente' | 'Fornitore' | 'Altro';
