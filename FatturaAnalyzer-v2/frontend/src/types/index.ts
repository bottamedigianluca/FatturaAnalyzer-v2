import { ReactNode } from 'react';

// =================================================================
// ===== CORE & PROVIDER TYPES (Auth, Theme, System Health) =====
// =================================================================

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
  checkHealth: () => Promise<void>;
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

export interface ProvidersWrapperProps {
  children: ReactNode;
  enableDevtools?: boolean;
  enablePerformanceMonitoring?: boolean;
}

export interface FeatureFlags {
  aiFeatures: boolean;
  smartReconciliation: boolean;
  advancedAnalytics: boolean;
  realTimeUpdates: boolean;
  performanceMonitoring: boolean;
}

// =================================================================
// ===== BUSINESS DOMAIN TYPES (Anagraphics, Invoices, Transactions) =====
// =================================================================

// --- Anagrafiche ---
export type AnagraphicsType = 'Cliente' | 'Fornitore' | 'Altro';

export interface Anagraphics {
  id: number;
  type: AnagraphicsType;
  denomination: string;
  piva?: string;
  cf?: string;
  address?: string;
  city?: string;
  province?: string;
  cap?: string;
  country?: string;
  phone?: string;
  email?: string;
  pec?: string;
  website?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  score?: number;
  total_invoiced?: number;
  last_activity?: string;
  tags?: string[];
  codice_destinatario?: string;
  iban?: string;
}

export interface AnagraphicsFilters {
  search?: string;
  type_filter?: 'Cliente' | 'Fornitore';
  province_filter?: string;
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  min_client_score?: number;
  has_email?: boolean;
  has_pec?: boolean;
  activity_period?: string;
}


// --- Fatture ---
export type InvoiceType = 'Attiva' | 'Passiva';
export type PaymentStatus = 'Aperta' | 'Scaduta' | 'Pagata Parz.' | 'Pagata Tot.' | 'Insoluta' | 'Riconciliata';

export interface Invoice {
  id: number;
  anagraphics_id: number;
  type: InvoiceType;
  doc_type: string;
  doc_number: string;
  doc_date: string;
  total_amount: number;
  due_date?: string;
  payment_status: PaymentStatus;
  paid_amount: number;
  open_amount: number;
  notes?: string;
  counterparty_name: string;
  lines?: InvoiceLine[];
  vat_summary?: InvoiceVATSummary[];
  created_at: string;
  updated_at: string;
  reconciliation_status?: 'Pending' | 'Partial' | 'Complete';
  days_overdue?: number;
  payment_method?: string;
  xml_filename?: string;
  p7m_source_file?: string;
  unique_hash: string;
}

export interface InvoiceLine {
  id: number;
  invoice_id: number;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_rate: number;
  item_code?: string;
  item_type?: string;
  unit_measure?: string;
}

export interface InvoiceVATSummary {
    id: number;
    invoice_id: number;
    vat_rate: number;
    taxable_amount: number;
    vat_amount: number;
}

export interface InvoiceFilters {
  search?: string;
  type_filter?: 'Attiva' | 'Passiva';
  status_filter?: string;
  anagraphics_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  payment_status?: string;
  amount_min?: number;
  amount_max?: number;
  overdue_only?: boolean;
}


// --- Transazioni Bancarie ---
export interface BankTransaction {
  id: number;
  transaction_date: string;
  value_date?: string;
  description: string;
  amount: number;
  reconciliation_status: 'Da Riconciliare' | 'Riconciliato Parz.' | 'Riconciliato Tot.' | 'Ignorato';
  reconciled_amount: number;
  remaining_amount: number;
  unique_hash: string;
  created_at?: string;
  updated_at?: string;
  causale_abi?: number;
  // Enhanced fields V4.0
  ai_confidence?: number;
  reconciliation_suggestions?: ReconciliationSuggestion[];
}

/**
 * Transaction Filters Interface - VERSIONE CORRETTA
 * Allineata esattamente con i parametri supportati dal backend
 */
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
  
  // ===== BACKWARD COMPATIBILITY (DA NON INVIARE DIRETTAMENTE AL BACKEND) =====
  reconciliation_status?: string; // Alias per status_filter
  limit?: number; // Alias per size
  offset?: number; // Calcolato da page/size
}

// =================================================================
// ===== UTILITY ENUMS, CONSTANTS & FUNCTIONS =====
// =================================================================

export enum ReconciliationStatus {
  DA_RICONCILIARE = "Da Riconciliare",
  RICONCILIATO_PARZ = "Riconciliato Parz.",
  RICONCILIATO_TOT = "Riconciliato Tot.",
  RICONCILIATO_ECCESSO = "Riconciliato Eccesso",
  IGNORATO = "Ignorato"
}

/**
 * Pulisce i filtri delle transazioni per l'invio al backend.
 */
export function cleanTransactionFiltersForAPI(filters: TransactionFilters): Record<string, any> {
  const cleaned: Record<string, any> = {
    status_filter: filters.status_filter || filters.reconciliation_status,
    search: filters.search,
    start_date: filters.start_date,
    end_date: filters.end_date,
    min_amount: filters.min_amount,
    max_amount: filters.max_amount,
    anagraphics_id_heuristic: filters.anagraphics_id_heuristic,
    hide_pos: filters.hide_pos,
    hide_worldline: filters.hide_worldline,
    hide_cash: filters.hide_cash,
    hide_commissions: filters.hide_commissions,
    page: filters.page,
    size: filters.size || filters.limit
  };

  // Rimuove chiavi undefined o null per una query pulita
  Object.keys(cleaned).forEach(key => (cleaned[key] === undefined || cleaned[key] === null) && delete cleaned[key]);
  return cleaned;
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
// =================================================================
// ===== ANALYTICS & REPORTING TYPES =====
// =================================================================

export interface AnalyticsRequest {
  analysis_type: string;
  parameters?: Record<string, any>;
  cache_enabled?: boolean;
  include_predictions?: boolean;
  output_format?: 'json' | 'excel' | 'csv' | 'pdf';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  time_range?: {
    start_date?: string;
    end_date?: string;
  };
  filters?: Record<string, any>;
}

export interface BatchAnalyticsRequest {
  requests: AnalyticsRequest[];
  parallel_execution?: boolean;
  timeout_seconds?: number;
  batch_name?: string;
}

export interface AnalyticsResponse<T = any> {
  success: boolean;
  data: T;
  analysis_metadata?: {
    analysis_type: string;
    execution_time_ms: number;
    cache_used: boolean;
    generated_at: string;
  };
  insights?: string[];
  recommendations?: string[];
}

export interface CustomReportConfig {
  title: string;
  sections: string[];
  date_range: { start: string; end: string };
  include_charts: boolean;
  include_tables: boolean;
  format: 'pdf' | 'excel' | 'html';
  template?: string;
}
// =================================================================
// ===== RECONCILIATION & ANALYTICS TYPES =====
// =================================================================

export interface ReconciliationSuggestion {
  confidence_score: number;
  invoice_ids: number[];
  transaction_ids?: number[];
  total_amount: number;
  description: string;
  match_type: 'Exact' | 'Partial' | 'AI_Suggested';
  reasoning?: string;
  ai_enhanced?: boolean;
}

export interface ManualMatchRequest {
  invoice_id: number;
  transaction_id: number;
  amount_to_match: number;
}

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
  pages: number;
  enhanced_data?: Record<string, any>;
}

// =================================================================
// ===== DASHBOARD & KPI TYPES =====
// =================================================================

export interface KPIData {
  total_receivables: number;
  total_payables: number;
  overdue_receivables_count: number;
  overdue_receivables_amount: number;
  revenue_ytd: number;
  revenue_yoy_change_ytd?: number;
  gross_margin_ytd: number;
  margin_percent_ytd?: number;
  active_customers_month: number;
  new_customers_month: number;
}

export interface CashFlowData {
  month: string;
  total_inflows: number;
  total_outflows: number;
  net_cash_flow: number;
  incassi_clienti: number;
  pagamenti_fornitori: number;
  commissioni_bancarie: number;
}

export interface TopClientData {
  id: number;
  denomination: string;
  total_revenue: number;
  num_invoices: number;
  score: number;
  avg_order_value: number;
  last_order_date?: string;
}

export interface DashboardData {
  kpis: KPIData;
  recent_invoices: Invoice[];
  recent_transactions: BankTransaction[];
  cash_flow_summary: CashFlowData[];
  top_clients: TopClientData[];
  overdue_invoices: Invoice[];
}

// =================================================================
// ===== API & HOOKS TYPES =====
// =================================================================

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

// =================================================================
// ===== CREATION & UPDATE TYPES =====
// =================================================================

export interface AnagraphicsCreate {
  type: AnagraphicsType;
  denomination: string;
  piva?: string;
  cf?: string;
  address?: string;
  cap?: string;
  city?: string;
  province?: string;
  country?: string;
  email?: string;
  pec?: string;
  phone?: string;
  codice_destinatario?: string;
  iban?: string;
}

export type AnagraphicsUpdate = Partial<AnagraphicsCreate>;

export interface InvoiceCreate {
  anagraphics_id: number;
  type: InvoiceType;
  doc_type: string;
  doc_number: string;
  doc_date: string; // YYYY-MM-DD
  total_amount: number;
  due_date?: string; // YYYY-MM-DD
  payment_method?: string;
  notes?: string;
  xml_filename?: string;
  p7m_source_file?: string;
  lines?: Omit<InvoiceLine, 'id' | 'invoice_id'>[];
  vat_summary?: Omit<InvoiceVATSummary, 'id' | 'invoice_id'>[];
}

export type InvoiceUpdate = Partial<Omit<InvoiceCreate, 'anagraphics_id'>> & {
  payment_status?: PaymentStatus;
  paid_amount?: number;
};

export interface BankTransactionCreate {
  transaction_date: string; // YYYY-MM-DD
  value_date?: string; // YYYY-MM-DD
  amount: number;
  description: string;
  unique_hash: string;
  causale_abi?: number;
}

export type BankTransactionUpdate = Partial<Omit<BankTransactionCreate, 'unique_hash'>>;
