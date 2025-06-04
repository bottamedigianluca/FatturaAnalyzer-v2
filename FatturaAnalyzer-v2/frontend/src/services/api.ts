/**
 * API Client for FatturaAnalyzer Backend
 * Configurato per comunicare con FastAPI backend
 */

import { Invoice, BankTransaction, Anagraphics, APIResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface PaginationParams {
  page?: number;
  size?: number;
}

export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
}

export interface InvoiceFilters extends PaginationParams {
  type_filter?: 'Attiva' | 'Passiva';
  status_filter?: string;
  anagraphics_id?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface TransactionFilters extends PaginationParams {
  status_filter?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  hide_pos?: boolean;
  hide_worldline?: boolean;
  hide_cash?: boolean;
  hide_commissions?: boolean;
}

export interface AnagraphicsFilters extends PaginationParams {
  type_filter?: 'Cliente' | 'Fornitore';
  search?: string;
  city?: string;
  province?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      headers: { ...defaultHeaders, ...options.headers },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private buildQuery(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    return searchParams.toString();
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request('/health');
  }

  // Anagraphics API
  async getAnagraphics(filters: AnagraphicsFilters = {}) {
    const query = this.buildQuery(filters);
    return this.request(`/api/anagraphics?${query}`);
  }

  async getAnagraphicsById(id: number): Promise<Anagraphics> {
    return this.request(`/api/anagraphics/${id}`);
  }

  async createAnagraphics(data: Partial<Anagraphics>): Promise<Anagraphics> {
    return this.request('/api/anagraphics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnagraphics(id: number, data: Partial<Anagraphics>): Promise<Anagraphics> {
    return this.request(`/api/anagraphics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAnagraphics(id: number): Promise<APIResponse> {
    return this.request(`/api/anagraphics/${id}`, {
      method: 'DELETE',
    });
  }

  async searchAnagraphics(query: string, type_filter?: string): Promise<APIResponse> {
    const params = this.buildQuery({ type_filter });
    return this.request(`/api/anagraphics/search/${encodeURIComponent(query)}?${params}`);
  }

  async getAnagraphicsFinancialSummary(id: number): Promise<APIResponse> {
    return this.request(`/api/anagraphics/${id}/financial-summary`);
  }

  // Invoices API
  async getInvoices(filters: InvoiceFilters = {}) {
    const query = this.buildQuery(filters);
    return this.request(`/api/invoices?${query}`);
  }

  async getInvoiceById(id: number): Promise<Invoice> {
    return this.request(`/api/invoices/${id}`);
  }

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    return this.request('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice> {
    return this.request(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: number): Promise<APIResponse> {
    return this.request(`/api/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async getOverdueInvoices(limit: number = 20): Promise<APIResponse> {
    return this.request(`/api/invoices/overdue/list?limit=${limit}`);
  }

  async getAgingSummary(invoice_type: 'Attiva' | 'Passiva' = 'Attiva'): Promise<APIResponse> {
    return this.request(`/api/invoices/aging/summary?invoice_type=${invoice_type}`);
  }

  async searchInvoices(query: string, type_filter?: string): Promise<APIResponse> {
    const params = this.buildQuery({ type_filter });
    return this.request(`/api/invoices/search/${encodeURIComponent(query)}?${params}`);
  }

  async updateInvoicePaymentStatus(
    id: number, 
    payment_status: string, 
    paid_amount?: number
  ): Promise<APIResponse> {
    const params = this.buildQuery({ payment_status, paid_amount });
    return this.request(`/api/invoices/${id}/update-payment-status?${params}`, {
      method: 'POST',
    });
  }

  // Transactions API
  async getTransactions(filters: TransactionFilters = {}) {
    const query = this.buildQuery(filters);
    return this.request(`/api/transactions?${query}`);
  }

  async getTransactionById(id: number): Promise<BankTransaction> {
    return this.request(`/api/transactions/${id}`);
  }

  async createTransaction(data: Partial<BankTransaction>): Promise<BankTransaction> {
    return this.request('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTransaction(id: number, data: Partial<BankTransaction>): Promise<BankTransaction> {
    return this.request(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: number): Promise<APIResponse> {
    return this.request(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  async getTransactionPotentialMatches(id: number, limit: number = 10): Promise<APIResponse> {
    return this.request(`/api/transactions/${id}/potential-matches?limit=${limit}`);
  }

  async updateTransactionStatus(
    id: number, 
    reconciliation_status: string, 
    reconciled_amount?: number
  ): Promise<APIResponse> {
    const body = { reconciliation_status, reconciled_amount };
    return this.request(`/api/transactions/${id}/update-status`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async batchUpdateTransactionStatus(
    transaction_ids: number[], 
    reconciliation_status: string
  ): Promise<APIResponse> {
    return this.request('/api/transactions/batch/update-status', {
      method: 'POST',
      body: JSON.stringify({ transaction_ids, reconciliation_status }),
    });
  }

  async searchTransactions(query: string, include_reconciled: boolean = false): Promise<APIResponse> {
    return this.request(`/api/transactions/search/${encodeURIComponent(query)}?include_reconciled=${include_reconciled}`);
  }

  async getTransactionStats(): Promise<APIResponse> {
    return this.request('/api/transactions/stats/summary');
  }

  async getCashFlowAnalysis(months: number = 12): Promise<APIResponse> {
    return this.request(`/api/transactions/analysis/cash-flow?months=${months}`);
  }

  // Reconciliation API
  async getReconciliationSuggestions(
    max_suggestions: number = 50, 
    confidence_threshold: number = 0.5
  ): Promise<APIResponse> {
    const params = this.buildQuery({ max_suggestions, confidence_threshold });
    return this.request(`/api/reconciliation/suggestions?${params}`);
  }

  async getReconciliationOpportunities(
    limit: number = 20, 
    amount_tolerance: number = 0.01
  ): Promise<APIResponse> {
    const params = this.buildQuery({ limit, amount_tolerance });
    return this.request(`/api/reconciliation/opportunities?${params}`);
  }

  async performReconciliation(
    invoice_id: number, 
    transaction_id: number, 
    amount: number
  ): Promise<APIResponse> {
    return this.request('/api/reconciliation/reconcile', {
      method: 'POST',
      body: JSON.stringify({ invoice_id, transaction_id, amount }),
    });
  }

  async performBatchReconciliation(reconciliations: Array<{
    invoice_id: number;
    transaction_id: number;
    amount: number;
  }>): Promise<APIResponse> {
    return this.request('/api/reconciliation/reconcile/batch', {
      method: 'POST',
      body: JSON.stringify(reconciliations),
    });
  }

  async autoReconcile(
    confidence_threshold: number = 0.8, 
    max_auto_reconcile: number = 10
  ): Promise<APIResponse> {
    const params = this.buildQuery({ confidence_threshold, max_auto_reconcile });
    return this.request(`/api/reconciliation/auto-reconcile?${params}`, {
      method: 'POST',
    });
  }

  async undoInvoiceReconciliation(invoice_id: number): Promise<APIResponse> {
    return this.request(`/api/reconciliation/undo/invoice/${invoice_id}`, {
      method: 'DELETE',
    });
  }

  async undoTransactionReconciliation(transaction_id: number): Promise<APIResponse> {
    return this.request(`/api/reconciliation/undo/transaction/${transaction_id}`, {
      method: 'DELETE',
    });
  }

  async getReconciliationStatus(): Promise<APIResponse> {
    return this.request('/api/reconciliation/status');
  }

  async getReconciliationLinks(
    invoice_id?: number, 
    transaction_id?: number, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<APIResponse> {
    const params = this.buildQuery({ invoice_id, transaction_id, limit, offset });
    return this.request(`/api/reconciliation/links?${params}`);
  }

  async validateReconciliationMatch(
    invoice_id: number, 
    transaction_id: number, 
    amount: number
  ): Promise<APIResponse> {
    return this.request('/api/reconciliation/validate-match', {
      method: 'POST',
      body: JSON.stringify({ invoice_id, transaction_id, amount }),
    });
  }

  async getReconciliationAnalytics(): Promise<APIResponse> {
    return this.request('/api/reconciliation/analytics/summary');
  }

  // Analytics API
  async getKPIs(): Promise<APIResponse> {
    return this.request('/api/analytics/kpis');
  }

  async getDashboardData(): Promise<APIResponse> {
    return this.request('/api/analytics/dashboard');
  }

  async getMonthlyRevenue(months: number = 12, invoice_type?: string): Promise<APIResponse> {
    const params = this.buildQuery({ months, invoice_type });
    return this.request(`/api/analytics/revenue/monthly?${params}`);
  }

  async getTopClients(limit: number = 20, period_months: number = 12): Promise<APIResponse> {
    const params = this.buildQuery({ limit, period_months });
    return this.request(`/api/analytics/clients/top?${params}`);
  }

  async getProductAnalysis(limit: number = 50, period_months: number = 12): Promise<APIResponse> {
    const params = this.buildQuery({ limit, period_months });
    return this.request(`/api/analytics/products?${params}`);
  }

  async getCashFlowForecast(months_ahead: number = 6): Promise<APIResponse> {
    return this.request(`/api/analytics/cash-flow/forecast?months_ahead=${months_ahead}`);
  }

  async getYearOverYearComparison(metric: string = 'revenue', current_year?: number): Promise<APIResponse> {
    const params = this.buildQuery({ metric, current_year });
    return this.request(`/api/analytics/year-over-year?${params}`);
  }

  // Import/Export API
  async importInvoicesXML(files: FileList): Promise<APIResponse> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    return this.request('/api/import/invoices/xml', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async importInvoicesZip(file: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/import/invoices/zip', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async importTransactionsCSV(file: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/import/transactions/csv', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async validateFile(file: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/import/validate-file', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async downloadTransactionTemplate(): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/api/import/templates/transactions-csv`);
    if (!response.ok) {
      throw new Error('Failed to download template');
    }
    return response.blob();
  }

  async exportInvoices(
    format: 'excel' | 'csv' | 'json' = 'excel',
    filters: any = {}
  ): Promise<Blob | APIResponse> {
    const params = this.buildQuery({ format, ...filters });
    const response = await fetch(`${this.baseURL}/api/import/export/invoices?${params}`);
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    if (format === 'json') {
      return response.json();
    } else {
      return response.blob();
    }
  }

  async exportTransactions(
    format: 'excel' | 'csv' | 'json' = 'excel',
    filters: any = {}
  ): Promise<Blob | APIResponse> {
    const params = this.buildQuery({ format, ...filters });
    const response = await fetch(`${this.baseURL}/api/import/export/transactions?${params}`);
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    if (format === 'json') {
      return response.json();
    } else {
      return response.blob();
    }
  }

  async createBackup(): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/api/import/backup/create`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Backup creation failed');
    }

    return response.blob();
  }

  async getImportHistory(limit: number = 50): Promise<APIResponse> {
    return this.request(`/api/import/status/import-history?limit=${limit}`);
  }

  // Cloud Sync API
  async getSyncStatus(): Promise<APIResponse> {
    return this.request('/api/sync/status');
  }

  async performSync(): Promise<APIResponse> {
    return this.request('/api/sync/upload', {
      method: 'POST',
    });
  }

  async downloadFromCloud(): Promise<APIResponse> {
    return this.request('/api/sync/download', {
      method: 'POST',
    });
  }

  async enableAutoSync(): Promise<APIResponse> {
    return this.request('/api/sync/auto/enable', {
      method: 'POST',
    });
  }

  async disableAutoSync(): Promise<APIResponse> {
    return this.request('/api/sync/auto/disable', {
      method: 'POST',
    });
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Default export
export default apiClient;