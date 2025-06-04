/**
 * TypeScript type definitions for FatturaAnalyzer Frontend
 * Sincronizzate con i modelli Pydantic del backend
 */

// Base types
export type AnagraphicsType = "Cliente" | "Fornitore";
export type InvoiceType = "Attiva" | "Passiva";
export type PaymentStatus = "Aperta" | "Scaduta" | "Pagata Parz." | "Pagata Tot." | "Insoluta" | "Riconciliata";
export type ReconciliationStatus = "Da Riconciliare" | "Riconciliato Parz." | "Riconciliato Tot." | "Riconciliato Eccesso" | "Ignorato";

// API Response wrapper
export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  size: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Anagraphics
export interface AnagraphicsBase {
  type: AnagraphicsType;
  piva?: string;
  cf?: string;
  denomination: string;
  address?: string;
  cap?: string;
  city?: string;
  province?: string;
  country: string;
  iban?: string;
  email?: string;
  phone?: string;
  pec?: string;
  codice_destinatario?: string;
}

export interface AnagraphicsCreate extends AnagraphicsBase {}

export interface AnagraphicsUpdate extends Partial<AnagraphicsBase> {}

export interface Anagraphics extends AnagraphicsBase {
  id: number;
  score: number;
  created_at: string;
  updated_at: string;
}

// Invoice Lines
export interface InvoiceLineBase {
  line_number: number;
  description?: string;
  quantity?: number;
  unit_measure?: string;
  unit_price?: number;
  total_price: number;
  vat_rate: number;
  item_code?: string;
  item_type?: string;
}

export interface InvoiceLineCreate extends InvoiceLineBase {}

export interface InvoiceLine extends InvoiceLineBase {
  id: number;
  invoice_id: number;
}

// Invoice VAT Summary
export interface InvoiceVATSummaryBase {
  vat_rate: number;
  taxable_amount: number;
  vat_amount: number;
}

export interface InvoiceVATSummaryCreate extends InvoiceVATSummaryBase {}

export interface InvoiceVATSummary extends InvoiceVATSummaryBase {
  id: number;
  invoice_id: number;
}

// Invoices
export interface InvoiceBase {
  anagraphics_id: number;
  type: InvoiceType;
  doc_type?: string;
  doc_number: string;
  doc_date: string; // ISO date string
  total_amount: number;
  due_date?: string; // ISO date string
  payment_method?: string;
  notes?: string;
  xml_filename?: string;
  p7m_source_file?: string;
}

export interface InvoiceCreate extends InvoiceBase {
  lines?: InvoiceLineCreate[];
  vat_summary?: InvoiceVATSummaryCreate[];
}

export interface InvoiceUpdate extends Partial<InvoiceBase> {
  payment_status?: PaymentStatus;
  paid_amount?: number;
}

export interface Invoice extends InvoiceBase {
  id: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  unique_hash: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  open_amount?: number;
  counterparty_name?: string;
  
  // Relations
  lines: InvoiceLine[];
  vat_summary: InvoiceVATSummary[];
}

// Bank Transactions
export interface BankTransactionBase {
  transaction_date: string; // ISO date string
  value_date?: string; // ISO date string
  amount: number;
  description?: string;
  causale_abi?: number;
}

export interface BankTransactionCreate extends BankTransactionBase {
  unique_hash: string;
}

export interface BankTransactionUpdate extends Partial<BankTransactionBase> {
  reconciliation_status?: ReconciliationStatus;
  reconciled_amount?: number;
}

export interface BankTransaction extends BankTransactionBase {
  id: number;
  reconciliation_status: ReconciliationStatus;
  reconciled_amount: number;
  unique_hash: string;
  created_at: string;
  updated_at?: string;
  
  // Computed fields
  remaining_amount?: number;
  is_income?: boolean;
  is_expense?: boolean;
}

// Reconciliation
export interface ReconciliationLinkBase {
  transaction_id: number;
  invoice_id: number;
  reconciled_amount: number;
  notes?: string;
}

export interface ReconciliationLinkCreate extends ReconciliationLinkBase {}

export interface ReconciliationLink extends ReconciliationLinkBase {
  id: number;
  reconciliation_date: string;
  created_at: string;
}

export interface ReconciliationSuggestion {
  confidence: "Alta" | "Media" | "Bassa";
  confidence_score: number;
  invoice_ids: number[];
  transaction_ids?: number[];
  description: string;
  total_amount: number;
  match_details?: Record<string, any>;
  reasons?: string[];
}

export interface ReconciliationRequest {
  invoice_id: number;
  transaction_id: number;
  amount: number;
}

export interface ReconciliationBatchRequest {
  invoice_ids: number[];
  transaction_ids: number[];
}

// Analytics
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
  avg_days_to_payment?: number;
  inventory_turnover_estimate?: number;
  active_customers_month: number;
  new_customers_month: number;
}

export interface CashFlowData {
  month: string;
  incassi_clienti: number;
  incassi_contanti: number;
  altri_incassi: number;
  pagamenti_fornitori: number;
  spese_carte: number;
  carburanti: number;
  trasporti: number;
  utenze: number;
  tasse_tributi: number;
  commissioni_bancarie: number;
  altri_pagamenti: number;
  net_operational_flow: number;
  total_inflows: number;
  total_outflows: number;
  net_cash_flow: number;
}

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  cost: number;
  gross_margin: number;
  margin_percent: number;
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

export interface ProductAnalysisData {
  normalized_product: string;
  total_quantity: number;
  total_value: number;
  num_invoices: number;
  avg_unit_price: number;
  original_descriptions: string[];
}

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

export interface AgingSummary {
  buckets: AgingBucket[];
  total_amount: number;
  total_count: number;
}

// Import/Export
export interface ImportResult {
  processed: number;
  success: number;
  duplicates: number;
  errors: number;
  unsupported: number;
  files: Array<{ name: string; status: string }>;
}

export interface FileUploadResponse {
  filename: string;
  size: number;
  content_type: string;
  status: string;
  message?: string;
}

// Cloud Sync
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
  timestamp: string;
}

// Filter types
export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
}

export interface AnagraphicsFilter {
  type?: AnagraphicsType;
  search?: string;
  city?: string;
  province?: string;
}

export interface InvoiceFilter {
  type?: InvoiceType;
  status?: PaymentStatus;
  anagraphics_id?: number;
  search?: string;
  date_range?: DateRangeFilter;
  min_amount?: number;
  max_amount?: number;
}

export interface TransactionFilter {
  status?: ReconciliationStatus;
  search?: string;
  date_range?: DateRangeFilter;
  min_amount?: number;
  max_amount?: number;
  anagraphics_id_heuristic?: number;
  hide_pos?: boolean;
  hide_worldline?: boolean;
  hide_cash?: boolean;
  hide_commissions?: boolean;
}

// Dashboard
export interface DashboardKPIs {
  total_receivables: number;
  total_payables: number;
  overdue_receivables_amount: number;
  overdue_receivables_count: number;
  overdue_payables_amount: number;
  overdue_payables_count: number;
  revenue_ytd: number;
  revenue_prev_year_ytd: number;
  revenue_yoy_change_ytd?: number;
  gross_margin_ytd: number;
  margin_percent_ytd?: number;
  avg_days_to_payment?: number;
  inventory_turnover_estimate?: number;
  active_customers_month: number;
  new_customers_month: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  recent_invoices: Invoice[];
  recent_transactions: BankTransaction[];
  cash_flow_summary: CashFlowData[];
  top_clients: TopClientData[];
  overdue_invoices: Invoice[];
}

// Search
export interface SearchResult {
  type: "invoice" | "transaction" | "anagraphics";
  id: number;
  title: string;
  subtitle: string;
  amount?: number;
  date?: string;
  status?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  took_ms: number;
}

// UI State types
export interface TableState {
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  sorting: Array<{
    id: string;
    desc: boolean;
  }>;
  columnFilters: Array<{
    id: string;
    value: any;
  }>;
  globalFilter: string;
}

export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}

// Form types
export interface AnagraphicsFormData extends Omit<AnagraphicsCreate, 'country'> {
  country?: string;
}

export interface InvoiceFormData extends Omit<InvoiceCreate, 'doc_date' | 'due_date'> {
  doc_date: Date;
  due_date?: Date;
}

export interface TransactionFormData extends Omit<BankTransactionCreate, 'transaction_date' | 'value_date'> {
  transaction_date: Date;
  value_date?: Date;
}

// Theme types
export type Theme = "light" | "dark" | "system";

// Navigation types
export interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string | number;
  children?: NavigationItem[];
}

// Notification types
export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MultiSeriesDataPoint {
  name: string;
  [key: string]: string | number;
}

// Settings types
export interface AppSettings {
  theme: Theme;
  language: string;
  currency: string;
  date_format: string;
  number_format: string;
  pagination_size: number;
  auto_sync: boolean;
  notifications: {
    email: boolean;
    desktop: boolean;
    sounds: boolean;
  };
}

// Hook return types
export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseMutationResult<T, V = any> {
  mutate: (variables: V) => Promise<T>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

// File upload types
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileWithProgress extends File {
  progress?: UploadProgress;
  status?: "pending" | "uploading" | "success" | "error";
  error?: string;
}

// Export commonly used types
export type {
  AnagraphicsType,
  InvoiceType,
  PaymentStatus,
  ReconciliationStatus,
  Theme,
};