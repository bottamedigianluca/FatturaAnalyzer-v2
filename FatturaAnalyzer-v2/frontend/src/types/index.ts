/**
 * Types V4.0 - Tipi Completi per FatturaAnalyzer
 * Include tutti i tipi necessari per l'applicazione
 */

// ===== BASE TYPES =====
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
  total?: number;
  items?: T[];
  enhanced_data?: any;
}

// ===== CORE ENTITY TYPES =====
export interface Invoice {
  id: number;
  numero: string;
  data_emissione: string;
  data_scadenza?: string;
  tipo_fattura: 'Attiva' | 'Passiva';
  anagraphics_id: number;
  anagraphics?: Anagraphics;
  total_amount: number;
  iva_amount?: number;
  payment_status: string;
  paid_amount?: number;
  note?: string;
  file_path?: string;
  created_at: string;
  updated_at: string;
  // Enhanced fields
  lines?: InvoiceLine[];
  reconciliation_links?: ReconciliationLink[];
  aging_days?: number;
  risk_score?: number;
}

export interface InvoiceLine {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_rate?: number;
  vat_amount?: number;
}

export interface BankTransaction {
  id: number;
  data_valuta: string;
  data_contabile: string;
  amount: number;
  description: string;
  reconciliation_status: string;
  anagraphics_id_heuristic?: number;
  anagraphics?: Anagraphics;
  note?: string;
  created_at: string;
  updated_at: string;
  // Enhanced fields V4.0
  enhanced_data?: {
    ai_confidence?: number;
    pattern_match?: boolean;
    similar_transactions?: number[];
    smart_suggestions?: any[];
  };
  reconciliation_links?: ReconciliationLink[];
  reliability_score?: number;
  category?: string;
  subcategory?: string;
}

export interface Anagraphics {
  id: number;
  type: 'Cliente' | 'Fornitore';
  business_name?: string;
  full_name?: string;
  piva?: string;
  codice_fiscale?: string;
  address?: string;
  city?: string;
  province?: string;
  cap?: string;
  phone?: string;
  email?: string;
  pec?: string;
  created_at: string;
  updated_at: string;
  // Enhanced fields
  client_score?: number;
  total_invoices?: number;
  total_amount?: number;
  payment_reliability?: number;
  last_transaction_date?: string;
}

export interface ReconciliationLink {
  id: number;
  invoice_id: number;
  transaction_id: number;
  amount: number;
  reconciliation_date: string;
  user_id?: number;
  ai_confidence?: number;
  ai_validated?: boolean;
  manual_override?: boolean;
  notes?: string;
}

// ===== FILTER TYPES =====
export interface PaginationParams {
  page?: number;
  size?: number;
  limit?: number;
  offset?: number;
}

export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
}

export interface InvoiceFilters extends PaginationParams, DateRangeFilter {
  type_filter?: 'Attiva' | 'Passiva';
  status_filter?: string;
  anagraphics_id?: number;
  search?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface TransactionFilters extends PaginationParams, DateRangeFilter {
  status_filter?: string;
  search?: string;
  min_amount?: number;
  max_amount?: number;
  anagraphics_id_heuristic?: number;
  hide_pos?: boolean;
  hide_worldline?: boolean;
  hide_cash?: boolean;
  hide_commissions?: boolean;
  // V4.0 Enhanced
  enhanced?: boolean;
  include_summary?: boolean;
  enable_ai_insights?: boolean;
  cache_enabled?: boolean;
}

export interface AnagraphicsFilters extends PaginationParams {
  type_filter?: 'Cliente' | 'Fornitore';
  search?: string;
  city?: string;
  province?: string;
}

// ===== ANALYTICS TYPES =====
export interface AnalyticsRequest {
  analysis_type: string;
  parameters?: Record<string, any>;
  cache_enabled?: boolean;
  include_predictions?: boolean;
  output_format?: 'json' | 'excel' | 'csv' | 'pdf';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface DashboardData {
  total_invoices: number;
  total_transactions: number;
  reconciled_amount: number;
  pending_reconciliation: number;
  kpis: {
    revenue_trend: number;
    reconciliation_rate: number;
    average_processing_time: number;
    ai_accuracy: number;
  };
  charts?: {
    monthly_revenue: any[];
    transaction_types: any[];
    reconciliation_status: any[];
  };
  recent_activity?: any[];
  alerts?: any[];
}

// ===== RECONCILIATION V4.0 TYPES =====
export interface UltraReconciliationRequest {
  operation_type: '1_to_1' | 'n_to_m' | 'smart_client' | 'auto' | 'ultra_smart';
  invoice_id?: number;
  transaction_id?: number;
  anagraphics_id_filter?: number;
  enable_ai_enhancement?: boolean;
  enable_smart_patterns?: boolean;
  enable_predictive_scoring?: boolean;
  enable_parallel_processing?: boolean;
  enable_caching?: boolean;
  confidence_threshold?: number;
  max_suggestions?: number;
  max_combination_size?: number;
  max_search_time_ms?: number;
  exclude_invoice_ids?: number[];
  start_date?: string;
  end_date?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  real_time?: boolean;
}

export interface ManualMatchRequest {
  invoice_id: number;
  transaction_id: number;
  amount_to_match: number;
  enable_ai_validation?: boolean;
  enable_learning?: boolean;
  force_match?: boolean;
  user_confidence?: number;
  notes?: string;
}

export interface BatchReconciliationRequest {
  reconciliation_pairs: Array<{
    invoice_id: number;
    transaction_id: number;
    amount: number;
  }>;
  enable_ai_validation?: boolean;
  enable_parallel_processing?: boolean;
  force_background?: boolean;
}

export interface ReconciliationSuggestion {
  invoice_id: number;
  transaction_id: number;
  confidence_score: number;
  amount: number;
  match_type: 'exact' | 'partial' | 'multi';
  ai_enhanced: boolean;
  reasoning?: string;
  risk_factors?: string[];
}

// ===== UI TYPES =====
export interface NotificationConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  dismissible?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  context?: string;
  retryable?: boolean;
}

// ===== HOOK RETURN TYPES =====
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

export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  refetch: () => void;
  isFetching: boolean;
}

// ===== IMPORT/EXPORT TYPES =====
export interface ImportResult {
  processed: number;
  success: number;
  duplicates: number;
  errors: number;
  unsupported: number;
  files: Array<{
    name: string;
    status: string;
    message?: string;
  }>;
}

export interface ExportOptions {
  format: 'excel' | 'csv' | 'json' | 'pdf';
  filters?: Record<string, any>;
  include_details?: boolean;
  include_reconciliation?: boolean;
  custom_fields?: string[];
}

// ===== SYNC TYPES =====
export interface SyncStatus {
  enabled: boolean;
  service_available: boolean;
  remote_file_id?: string;
  last_sync_time?: string;
  auto_sync_running: boolean;
}

export interface SyncResult {
  success: boolean;
  action?: string;
  message: string;
  timestamp?: string;
}

// ===== FORM TYPES =====
export interface FormField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  label: string;
  required?: boolean;
  validation?: (value: any) => string | null;
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  defaultValue?: any;
}

export interface FormErrors {
  [key: string]: string | null;
}

// ===== UTILITY TYPES =====
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export type Theme = 'light' | 'dark' | 'system';

export type Language = 'it' | 'en';

// ===== FEATURES FLAGS =====
export interface FeatureFlags {
  ai_insights: boolean;
  smart_reconciliation: boolean;
  ultra_analytics: boolean;
  enhanced_transactions: boolean;
  predictive_scoring: boolean;
  pattern_learning: boolean;
  real_time_metrics: boolean;
  advanced_export: boolean;
  cloud_sync: boolean;
  setup_wizard: boolean;
}

// ===== CHART TYPES =====
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface ChartConfig {
  type: 'line' | 'area' | 'bar' | 'pie' | 'scatter' | 'composed';
  data: ChartDataPoint[];
  title?: string;
  description?: string;
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height?: number;
  formatters?: Record<string, (value: any) => string>;
}

// ===== PERFORMANCE TYPES =====
export interface PerformanceMetrics {
  renderTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
}

// ===== SEARCH TYPES =====
export interface SearchResult<T = any> {
  items: T[];
  total: number;
  query: string;
  filters?: Record<string, any>;
  suggestions?: string[];
}

export interface SearchOptions {
  query: string;
  filters?: Record<string, any>;
  sort?: SortConfig;
  pagination?: PaginationParams;
  fuzzy?: boolean;
  highlight?: boolean;
}

// ===== AUDIT TYPES =====
export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id: number;
  changes?: Record<string, any>;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

// ===== BACKUP TYPES =====
export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  created_at: string;
  type: 'manual' | 'automatic';
  status: 'completed' | 'in_progress' | 'failed';
}

// ===== VALIDATION TYPES =====
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule[];
}

// ===== WEBSOCKET TYPES =====
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  id: string;
}

export interface RealTimeUpdate {
  entity: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

// ===== TASK TYPES =====
export interface Task {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

// ===== SYSTEM HEALTH TYPES =====
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  components: {
    database: 'up' | 'down';
    api: 'up' | 'down';
    cache: 'up' | 'down';
    storage: 'up' | 'down';
  };
  metrics: {
    memory_usage: number;
    cpu_usage: number;
    disk_usage: number;
    response_time: number;
  };
}

// ===== CONFIGURATION TYPES =====
export interface AppConfig {
  api_url: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: FeatureFlags;
  limits: {
    max_file_size: number;
    max_batch_size: number;
    rate_limit: number;
  };
}

// ===== DEFAULT EXPORTS =====
export default {};

// ===== RE-EXPORTS FOR COMPATIBILITY =====
export type {
  // Core entities
  Invoice as InvoiceType,
  BankTransaction as TransactionType,
  Anagraphics as AnagraphicsType,
  
  // API
  APIResponse as ApiResponse,
  
  // Filters
  InvoiceFilters as InvoiceFilter,
  TransactionFilters as TransactionFilter,
  AnagraphicsFilters as AnagraphicsFilter,
  
  // UI
  NotificationConfig as Notification,
  LoadingState as Loading,
  ErrorState as Error,
};

// ===== UTILITY TYPE HELPERS =====
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type KeyOf<T> = keyof T;

export type ValueOf<T> = T[keyof T];

// ===== BRANDED TYPES =====
export type InvoiceId = number & { __brand: 'InvoiceId' };
export type TransactionId = number & { __brand: 'TransactionId' };
export type AnagraphicsId = number & { __brand: 'AnagraphicsId' };

// ===== ENUM-LIKE TYPES =====
export const InvoiceTypes = {
  ACTIVE: 'Attiva' as const,
  PASSIVE: 'Passiva' as const,
} as const;

export const AnagraphicsTypes = {
  CLIENT: 'Cliente' as const,
  SUPPLIER: 'Fornitore' as const,
} as const;

export const ReconciliationStatuses = {
  UNRECONCILED: 'Da Riconciliare' as const,
  RECONCILED: 'Riconciliato' as const,
  PARTIAL: 'Parzialmente Riconciliato' as const,
} as const;

export type InvoiceType = typeof InvoiceTypes[keyof typeof InvoiceTypes];
export type AnagraphicsType = typeof AnagraphicsTypes[keyof typeof AnagraphicsTypes];
export type ReconciliationStatus = typeof ReconciliationStatuses[keyof typeof ReconciliationStatuses];
