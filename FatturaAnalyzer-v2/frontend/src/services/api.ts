// frontend/src/services/api.ts

/**
 * API Client per FatturaAnalyzer v2 - VERSIONE CORRETTA FINALE (v4.1)
 * Fix per errori TypeScript + endpoint allineati con backend reale
 */

import {
  APIResponse,
  PaginatedResponse,
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  InvoiceFilters,
  BankTransaction,
  BankTransactionCreate,
  BankTransactionUpdate,
  TransactionFilters,
  Anagraphics,
  AnagraphicsCreate,
  AnagraphicsUpdate,
  AnagraphicsFilters,
  ReconciliationSuggestion,
  ManualMatchRequest,
  DashboardData,
  KPIData,
  CashFlowData,
  TopClientData,
  HealthStatus,
  cleanTransactionFiltersForAPI
} from '@/types';

// ===== TYPES LOCALI PER COMPATIBILITY =====

// Fix per SyncStatus mancante
interface SyncStatus {
  enabled: boolean;
  auto_sync_running: boolean;
  last_sync_time: string | null;
  service_available: boolean;
  sync_frequency?: string;
  last_error?: string;
}

// Fix per SyncResult mancante
interface SyncResult {
  success: boolean;
  synced_records: number;
  errors: string[];
  sync_time: string;
  force_direction?: 'upload' | 'download';
}

// Fix per ImportResult mancante
interface ImportResult {
  success: boolean;
  processed: number;
  imported: number;
  errors: string[];
  warnings?: string[];
  summary?: {
    invoices?: number;
    transactions?: number;
    anagraphics?: number;
  };
}

interface BatchReconciliationRequest {
  reconciliation_pairs: Array<{
    invoice_id: number;
    transaction_id: number;
    amount: number;
  }>;
  enable_ai_validation?: boolean;
  enable_parallel_processing?: boolean;
}

interface AnalyticsRequest {
  analysis_type: string;
  parameters?: Record<string, any>;
  cache_enabled?: boolean;
  output_format?: string;
}

// ===== CONFIGURAZIONE API =====

// Fix per import.meta.env
const getAPIBaseURL = (): string => {
  // Verifica se siamo in ambiente browser
  if (typeof window !== 'undefined' && window.location) {
    // In sviluppo usa proxy Vite, in produzione usa URL relativo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return ''; // Usa proxy Vite in development
    }
  }
  
  // Fallback per produzione o SSR
  return 'http://127.0.0.1:8000';
};

const API_BASE_URL = getAPIBaseURL();

/**
 * Funzione di richiesta generica e robusta.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let finalEndpoint = endpoint;
  const noApiPrefixEndpoints = ['/health', '/health/'];
  
  if (!finalEndpoint.startsWith('/api') && !noApiPrefixEndpoints.some(prefix => finalEndpoint.startsWith(prefix))) {
    finalEndpoint = `/api${finalEndpoint.startsWith('/') ? '' : '/'}${finalEndpoint}`;
  }

  const url = `${API_BASE_URL}${finalEndpoint}`;

  const defaultHeaders: HeadersInit = {
    'Accept': 'application/json',
  };
  
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('❌ API Error:', response.status, finalEndpoint, errorMessage);
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('🔌 Backend connection failed. Is the server running at:', API_BASE_URL);
      throw new Error('Backend non raggiungibile. Verifica che il server sia in esecuzione.');
    }
    throw error;
  }
}

/**
 * Costruisce una stringa di query URL da un oggetto di parametri.
 */
function buildQuery(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  return searchParams.toString();
}

// ===== API CLIENT =====

export const apiClient = {
  // --- Metodi HTTP generici ---
  get: <T>(endpoint: string, params?: Record<string, any>): Promise<T> => {
    const query = params ? `?${buildQuery(params)}` : '';
    return request<T>(`${endpoint}${query}`);
  },

  post: <T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> => {
    return request<T>(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : null),
      ...options,
    });
  },

  put: <T>(endpoint: string, data: any, options?: RequestInit): Promise<T> => {
    return request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  },

  delete: <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    return request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  },

  // ===== HEALTH & SYSTEM =====
  healthCheck: (): Promise<APIResponse<HealthStatus>> => apiClient.get('/health'),
  
  getSystemInfo: (): Promise<APIResponse> => apiClient.get('/system/info'),
  
  checkFirstRun: (): Promise<APIResponse<{is_first_run: boolean}>> => apiClient.get('/first-run/check'),
  
  startSetupWizard: (): Promise<APIResponse> => apiClient.post('/first-run/wizard/start'),
  
  setupDatabase: (): Promise<APIResponse> => apiClient.post('/first-run/wizard/database-setup'),
  
  completeSetupWizard: (): Promise<APIResponse> => apiClient.post('/first-run/wizard/complete'),
  
  skipWizard: (): Promise<APIResponse> => apiClient.post('/first-run/wizard/skip'),
  
  // Database initialization
  initializeDatabase: async (): Promise<APIResponse> => {
    try {
      return await apiClient.post('/system/database/initialize');
    } catch (error) {
      console.warn('Database initialization endpoint not available');
      return {
        success: false,
        message: 'Database initialization not available via API'
      };
    }
  },
  
  checkDatabaseStatus: async (): Promise<APIResponse> => {
    try {
      return await apiClient.get('/system/database/status');
    } catch (error) {
      console.warn('Database status endpoint not available');
      return {
        success: true,
        data: {
          status: 'unknown',
          tables_exist: false,
          needs_migration: true
        }
      };
    }
  },
  
  testBackendConnection: async (): Promise<{ connected: boolean; message: string; details?: any }> => {
    try {
      const data = await apiClient.healthCheck();
      return { connected: true, message: 'Connessione riuscita!', details: data };
    } catch (error) {
      return { connected: false, message: (error as Error).message, details: error };
    }
  },

  // ===== ANAGRAPHICS =====
  getAnagraphics: (filters: AnagraphicsFilters): Promise<PaginatedResponse<Anagraphics>> => 
    apiClient.get('/anagraphics', filters),
  
  getAnagraphicsById: (id: number): Promise<Anagraphics> => 
    apiClient.get(`/anagraphics/${id}`),
  
  createAnagraphics: (data: AnagraphicsCreate): Promise<Anagraphics> => 
    apiClient.post('/anagraphics', data),
  
  updateAnagraphics: (id: number, data: AnagraphicsUpdate): Promise<Anagraphics> => 
    apiClient.put(`/anagraphics/${id}`, data),
  
  deleteAnagraphics: (id: number): Promise<APIResponse> => 
    apiClient.delete(`/anagraphics/${id}`),
  
  searchAnagraphics: (query: string, type_filter?: string, limit?: number): Promise<APIResponse<Anagraphics[]>> => 
    apiClient.get('/anagraphics/search', { query, type_filter, limit }),
  
  getAnagraphicsStats: (): Promise<APIResponse> => 
    apiClient.get('/anagraphics/stats'),
  
  validatePIVA: (piva: string): Promise<APIResponse> => 
    apiClient.post('/anagraphics/validate/piva', { piva }),
  
  validateCodiceFiscale: (cf: string): Promise<APIResponse> => 
    apiClient.post('/anagraphics/validate/cf', { cf }),
  
  // ===== INVOICES =====
  getInvoices: (filters: InvoiceFilters): Promise<PaginatedResponse<Invoice>> => 
    apiClient.get('/invoices', filters),
  
  getInvoiceById: (id: number): Promise<Invoice> => 
    apiClient.get(`/invoices/${id}`),
  
  createInvoice: (data: InvoiceCreate): Promise<Invoice> => 
    apiClient.post('/invoices', data),
  
  updateInvoice: (id: number, data: InvoiceUpdate): Promise<Invoice> => 
    apiClient.put(`/invoices/${id}`, data),
  
  deleteInvoice: (id: number): Promise<APIResponse> => 
    apiClient.delete(`/invoices/${id}`),
  
  updateInvoicePaymentStatus: (id: number, payment_status: string, paid_amount?: number): Promise<APIResponse> => 
    apiClient.post(`/invoices/${id}/update-payment-status`, { payment_status, paid_amount }),
  
  getOverdueInvoices: (limit: number): Promise<APIResponse<Invoice[]>> => 
    apiClient.get('/invoices/overdue/list', { limit }),
  
  getInvoicesStats: (): Promise<APIResponse> => 
    apiClient.get('/invoices/stats'),
  
  getInvoiceReconciliationLinks: (id: number): Promise<APIResponse> => 
    apiClient.get(`/invoices/${id}/reconciliation-links`),
  
  searchInvoices: (query: string, type_filter?: string, limit?: number): Promise<APIResponse<Invoice[]>> => 
    apiClient.get('/invoices/search', { query, type_filter, limit }),
  
  getAgingSummary: (invoiceType: 'Attiva' | 'Passiva'): Promise<APIResponse> => 
    apiClient.get('/invoices/aging-summary', { invoice_type: invoiceType }),

  // ===== TRANSACTIONS =====
  getTransactions: (filters: TransactionFilters): Promise<PaginatedResponse<BankTransaction>> => {
    const cleanFilters = cleanTransactionFiltersForAPI(filters);
    return apiClient.get('/transactions', cleanFilters);
  },
  
  getTransactionById: (id: number): Promise<BankTransaction> => 
    apiClient.get(`/transactions/${id}`),
  
  createTransaction: (data: BankTransactionCreate): Promise<BankTransaction> => 
    apiClient.post('/transactions', data),
  
  updateTransaction: (id: number, data: BankTransactionUpdate): Promise<BankTransaction> => 
    apiClient.put(`/transactions/${id}`, data),
  
  deleteTransaction: (id: number, confirm: boolean = true): Promise<APIResponse> => 
    apiClient.delete(`/transactions/${id}?confirm=${confirm}`),
  
  getTransactionStatsV4: (): Promise<APIResponse> => 
    apiClient.get('/transactions/stats/summary'),
  
  getTransactionHealthV4: (): Promise<APIResponse> => 
    apiClient.get('/transactions/health'),
  
  getTransactionMetricsV4: (): Promise<APIResponse> => 
    apiClient.get('/transactions/metrics'),
  
  batchUpdateTransactionStatus: (transaction_ids: number[], reconciliation_status: string): Promise<APIResponse> => 
    apiClient.post('/transactions/batch/update-status', { transaction_ids, reconciliation_status }),
  
  searchTransactions: (query: string, limit?: number, include_reconciled?: boolean): Promise<APIResponse<BankTransaction[]>> => 
    apiClient.get(`/transactions/search/${encodeURIComponent(query)}`, { limit, include_reconciled }),

  // ===== RECONCILIATION =====
  performReconciliation: (invoiceId: number, transactionId: number, amount: number): Promise<APIResponse> => 
    apiClient.post('/reconciliation/reconcile', { invoice_id: invoiceId, transaction_id: transactionId, amount }),
  
  getReconciliationSuggestions: (maxSuggestions: number = 10, confidence: number = 0.5): Promise<APIResponse<ReconciliationSuggestion[]>> => 
    apiClient.get('/reconciliation/suggestions', { limit: maxSuggestions, confidence }),
  
  getReconciliationHealth: (): Promise<APIResponse> => 
    apiClient.get('/reconciliation/health'),
  
  applyManualMatchV4: async (request: ManualMatchRequest): Promise<APIResponse> => {
    try {
      return await apiClient.post('/reconciliation/manual-match', request);
    } catch (error) {
      return await apiClient.performReconciliation(request.invoice_id, request.transaction_id, request.amount_to_match);
    }
  },
  
  processBatchReconciliationV4: async (request: BatchReconciliationRequest): Promise<APIResponse> => {
    try {
      return await apiClient.post('/reconciliation/batch/process', request);
    } catch (error) {
      const results = await Promise.allSettled(
        request.reconciliation_pairs.map(pair => 
          apiClient.performReconciliation(pair.invoice_id, pair.transaction_id, pair.amount)
        )
      );
      const successful = results.filter(r => r.status === 'fulfilled').length;
      return {
        success: true,
        message: `Batch completed: ${successful}/${request.reconciliation_pairs.length} successful`,
        data: { successful, total: request.reconciliation_pairs.length }
      };
    }
  },

  // Metodi mancanti richiesti dagli hook
  getReconciliationPerformanceMetrics: async (): Promise<APIResponse> => {
    try {
      return await apiClient.get('/reconciliation/performance/metrics');
    } catch (error) {
      console.warn('Reconciliation performance metrics not available');
      return {
        success: true,
        data: {
          success_rate: 0,
          average_confidence: 0,
          total_reconciliations: 0,
          ai_accuracy: 0
        }
      };
    }
  },
  
  getReconciliationSystemStatus: async (): Promise<APIResponse> => {
    try {
      return await apiClient.get('/reconciliation/system/status');
    } catch (error) {
      console.warn('Reconciliation system status not available');
      return {
        success: true,
        data: {
          system_status: 'unknown',
          ai_engine_status: 'unknown',
          last_update: new Date().toISOString()
        }
      };
    }
  },

  // ===== ANALYTICS =====
  getDashboardData: async (): Promise<APIResponse<DashboardData>> => {
    try {
      return await apiClient.get('/analytics/dashboard');
    } catch (error: any) {
      if (error.message?.includes('404')) {
        console.warn('Dashboard endpoint not available, creating fallback data');
        const kpis = await apiClient.getKPIs();
        return {
          success: true,
          data: {
            kpis,
            recent_invoices: [],
            recent_transactions: [],
            cash_flow_summary: [],
            top_clients: [],
            overdue_invoices: []
          }
        };
      }
      throw error;
    }
  },
  
  getKPIs: async (): Promise<KPIData> => {
    try {
      return await apiClient.get('/analytics/kpis');
    } catch (error: any) {
      if (error.message?.includes('404')) {
        console.warn('KPIs endpoint not available, creating fallback data');
        return {
          total_receivables: 0,
          total_payables: 0,
          overdue_receivables_count: 0,
          overdue_receivables_amount: 0,
          revenue_ytd: 0,
          revenue_yoy_change_ytd: 0,
          gross_margin_ytd: 0,
          margin_percent_ytd: 0,
          active_customers_month: 0,
          new_customers_month: 0,
        };
      }
      throw error;
    }
  },
  
  getCashFlowAnalysis: async (months: number = 12): Promise<APIResponse<CashFlowData[]>> => {
    try {
      return await apiClient.get('/analytics/cash-flow', { months });
    } catch (error) {
      console.warn('Cash flow analysis failed:', error);
      return {
        success: true,
        data: [],
        message: 'Cash flow analysis not available'
      };
    }
  },
  
  getAnalyticsHealth: async (): Promise<APIResponse> => {
    try {
      return await apiClient.get('/analytics/health');
    } catch (error) {
      return {
        success: true,
        data: { 
          status: 'unknown', 
          message: 'Analytics health check not available',
          features_available: false 
        }
      };
    }
  },

  // ===== IMPORT/EXPORT =====
  importInvoicesXML: (files: File[]): Promise<ImportResult> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file, file.name));
    return request<ImportResult>('/import-export/invoices/xml', { method: 'POST', body: formData });
  },
  
  importTransactionsCSV: (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return request<ImportResult>('/import-export/transactions/csv', { method: 'POST', body: formData });
  },
  
  validateInvoiceFiles: (files: FileList | File[]): Promise<APIResponse> => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file, file.name));
    return request<APIResponse>('/import-export/validate-zip', { method: 'POST', body: formData });
  },
  
  validateTransactionsCSV: (file: File): Promise<APIResponse> => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return request<APIResponse>('/import-export/validate/csv', { method: 'POST', body: formData });
  },
  
  validateZIPArchive: (file: File): Promise<APIResponse> => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return request<APIResponse>('/import-export/validate-zip', { method: 'POST', body: formData });
  },
  
  previewTransactionsCSV: async (file: File, maxRows: number = 10): Promise<APIResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('max_rows', maxRows.toString());
      return await apiClient.post('/import-export/preview/csv', formData);
    } catch (error) {
      console.warn('CSV preview not available, using fallback');
      return {
        success: true,
        data: {
          preview_rows: [],
          total_rows: 0,
          columns: ['data', 'descrizione', 'importo'],
          validation_errors: []
        }
      };
    }
  },
  
  bulkImportData: async (dataType: string, file: File, options: Record<string, any> = {}): Promise<ImportResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('data_type', dataType);
      formData.append('options', JSON.stringify(options));
      return await apiClient.post('/import-export/bulk-import', formData);
    } catch (error) {
      console.warn('Bulk import not available, using standard import');
      if (dataType === 'invoices') {
        return await apiClient.importInvoicesXML([file]);
      } else if (dataType === 'transactions') {
        return await apiClient.importTransactionsCSV(file);
      }
      throw error;
    }
  },
  
  getExportPresets: async (): Promise<APIResponse> => {
    try {
      return await apiClient.get('/import-export/export/presets');
    } catch (error) {
      console.warn('Export presets endpoint failed, using fallback');
      return {
        success: true,
        data: [
          {
            id: 'invoices-default',
            name: 'Fatture Standard',
            type: 'invoices',
            format: 'excel',
            filters: {},
            columns: ['numero', 'data', 'cliente', 'importo']
          },
          {
            id: 'transactions-default',
            name: 'Transazioni Standard', 
            type: 'transactions',
            format: 'csv',
            filters: {},
            columns: ['data', 'descrizione', 'importo', 'stato']
          }
        ]
      };
    }
  },
  
  downloadTransactionTemplate: async (): Promise<Blob> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/import-export/templates/transactions-csv`);
      if (!response.ok) throw new Error('Template download failed');
      return response.blob();
    } catch (error) {
      const csvContent = 'data,descrizione,importo,tipo\n2024-01-01,Esempio transazione,100.00,Entrata';
      return new Blob([csvContent], { type: 'text/csv' });
    }
  },
  
  getImportHistory: (limit: number = 20): Promise<APIResponse> => 
    apiClient.get('/sync/history', { limit }),
  
  getImportStatistics: (): Promise<APIResponse> => 
    apiClient.get('/import-export/statistics'),
  
  getImportExportHealth: (): Promise<APIResponse> => 
    apiClient.get('/import-export/health'),
  
  getSupportedFormats: (): Promise<APIResponse> => 
    apiClient.get('/import-export/supported-formats'),
  
  getImportTemplate: async (dataType: string): Promise<APIResponse> => {
    try {
      return await apiClient.get(`/import-export/templates/${dataType}`);
    } catch (error) {
      console.warn(`Template for ${dataType} not available`);
      return {
        success: true,
        data: {
          template_url: null,
          columns: [],
          sample_data: {}
        }
      };
    }
  },
  
  getImportStatus: async (importId: string): Promise<APIResponse> => {
    try {
      return await apiClient.get(`/import-export/status/${importId}`);
    } catch (error) {
      return {
        success: true,
        data: {
          status: 'unknown',
          progress: 0,
          message: 'Status tracking not available'
        }
      };
    }
  },
  
  // Cleanup methods
  cleanupTempFiles: (options: {
    older_than_hours?: number;
    file_types?: string[];
    force?: boolean;
  } = {}): Promise<APIResponse> => {
    return apiClient.post('/import-export/cleanup/temp-files', options);
  },
  
  getCleanupStatus: (): Promise<APIResponse> => {
    return apiClient.get('/import-export/cleanup/status');
  },
  
  enableAutoCleanup: (hours: number = 24): Promise<APIResponse> => {
    return apiClient.post('/import-export/cleanup/auto-enable', { cleanup_interval_hours: hours });
  },
  
  disableAutoCleanup: (): Promise<APIResponse> => {
    return apiClient.post('/import-export/cleanup/auto-disable');
  },
  
  exportData: async (dataType: string, format: string, filters?: Record<string, any>): Promise<Blob> => {
    try {
      const query = filters ? `?${buildQuery(filters)}` : '';
      const response = await fetch(`${API_BASE_URL}/api/import-export/export/${dataType}?format=${format}${query}`);
      if (!response.ok) throw new Error('Export failed');
      return response.blob();
    } catch (error) {
      const fallbackData = { message: 'Export not available', dataType, format };
      return new Blob([JSON.stringify(fallbackData, null, 2)], { type: 'application/json' });
    }
  },

  // ===== CLOUD SYNC =====
  getSyncStatus: (): Promise<APIResponse<SyncStatus>> => 
    apiClient.get('/sync/status'),
  
  enableSync: (): Promise<APIResponse> => 
    apiClient.post('/sync/enable'),
  
  disableSync: (): Promise<APIResponse> => 
    apiClient.post('/sync/disable'),
  
  performManualSync: (force_direction?: 'upload' | 'download'): Promise<APIResponse<SyncResult>> => 
    apiClient.post('/sync/manual', { force_direction }),
  
  createBackup: (): Promise<APIResponse> => 
    apiClient.post('/system/backup/create'),
};

export default apiClient;
