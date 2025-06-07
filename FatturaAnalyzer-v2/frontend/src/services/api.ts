/**
 * COMPLETE API Client for FatturaAnalyzer Backend v2
 * ALL ENDPOINTS INTEGRATED - Analytics, Reconciliation, Import/Export, Setup, Sync
 * Configurato per comunicare con FastAPI backend completo
 */

import { Invoice, BankTransaction, Anagraphics, APIResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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
  anagraphics_id_heuristic?: number;
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

    // Log richieste in development
    if (import.meta.env.DEV) {
      console.log('🚀 API Request:', options.method || 'GET', endpoint);
    }

    try {
      const response = await fetch(url, {
        headers: { ...defaultHeaders, ...options.headers },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        
        console.error('❌ API Error:', response.status, endpoint, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Log risposte in development
      if (import.meta.env.DEV) {
        console.log('✅ API Response:', response.status, endpoint);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🔌 Backend connection failed. Make sure backend is running at:', this.baseURL);
        throw new Error('Backend non raggiungibile. Verifica che sia in esecuzione.');
      }
      throw error;
    }
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

  // ===== HEALTH CHECK =====
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request('/health');
  }

  // ===== FIRST RUN & SETUP API =====
  
  async checkFirstRun(): Promise<APIResponse> {
    return this.request('/api/first-run/check');
  }

  async startSetupWizard(): Promise<APIResponse> {
    return this.request('/api/first-run/wizard/start');
  }

  async setupDatabase(): Promise<APIResponse> {
    return this.request('/api/first-run/wizard/database-setup', { method: 'POST' });
  }

  async completeSetupWizard(): Promise<APIResponse> {
    return this.request('/api/first-run/wizard/complete', { method: 'POST' });
  }

  async getWizardStatus(): Promise<APIResponse> {
    return this.request('/api/first-run/wizard/status');
  }

  async skipWizard(): Promise<APIResponse> {
    return this.request('/api/first-run/wizard/skip', { method: 'POST' });
  }

  async getSystemInfo(): Promise<APIResponse> {
    return this.request('/api/first-run/system/info');
  }

  async testDatabaseConnection(): Promise<APIResponse> {
    return this.request('/api/first-run/wizard/test-database', { method: 'POST' });
  }

  async generateSampleData(): Promise<APIResponse> {
    return this.request('/api/first-run/wizard/generate-sample-data', { method: 'POST' });
  }

  async getWizardSteps(): Promise<APIResponse> {
    return this.request('/api/first-run/wizard/steps');
  }

  async getFirstRunHealth(): Promise<APIResponse> {
    return this.request('/api/first-run/health');
  }

  // Setup API
  async getSetupStatus(): Promise<APIResponse> {
    return this.request('/api/setup/status');
  }

  async extractCompanyDataFromInvoice(file: File, invoiceType: string): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('invoice_type', invoiceType);
    
    return this.request('/api/setup/extract-from-invoice', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async completeSetup(setupData: any): Promise<APIResponse> {
    return this.request('/api/setup/complete', {
      method: 'POST',
      body: JSON.stringify(setupData),
    });
  }

  async validateCompanyData(companyData: any): Promise<APIResponse> {
    return this.request('/api/setup/validate-company-data', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  }

  async getImportSuggestions(): Promise<APIResponse> {
    return this.request('/api/setup/import-suggestions');
  }

  // ===== ANAGRAPHICS API =====
  
  async getAnagraphics(filters: AnagraphicsFilters = {}) {
    const query = this.buildQuery(filters);
    return this.request(`/api/anagraphics/${query ? '?' + query : ''}`);
  }

  async getAnagraphicsById(id: number): Promise<Anagraphics> {
    return this.request(`/api/anagraphics/${id}`);
  }

  async createAnagraphics(data: Partial<Anagraphics>): Promise<Anagraphics> {
    return this.request('/api/anagraphics/', {
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
    return this.request(`/api/anagraphics/search/${encodeURIComponent(query)}${params ? '?' + params : ''}`);
  }

  // ===== INVOICES API =====
  
  async getInvoices(filters: InvoiceFilters = {}) {
    const query = this.buildQuery(filters);
    return this.request(`/api/invoices/${query ? '?' + query : ''}`);
  }

  async getInvoiceById(id: number): Promise<Invoice> {
    return this.request(`/api/invoices/${id}`);
  }

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    return this.request('/api/invoices/', {
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

  async getInvoiceReconciliationLinks(invoiceId: number): Promise<APIResponse> {
    return this.request(`/api/invoices/${invoiceId}/reconciliation-links`);
  }

  async getOverdueInvoices(limit: number = 20): Promise<APIResponse> {
    return this.request(`/api/invoices/overdue/list?limit=${limit}`);
  }

  async getAgingSummary(invoice_type: 'Attiva' | 'Passiva' = 'Attiva'): Promise<APIResponse> {
    return this.request(`/api/invoices/aging/summary?invoice_type=${invoice_type}`);
  }

  async searchInvoices(query: string, type_filter?: string): Promise<APIResponse> {
    const params = this.buildQuery({ type_filter });
    return this.request(`/api/invoices/search/${encodeURIComponent(query)}${params ? '?' + params : ''}`);
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

  async getInvoicesStats(): Promise<APIResponse> {
    return this.request('/api/invoices/stats/summary');
  }

  // ===== TRANSACTIONS API =====
  
  async getTransactions(filters: TransactionFilters = {}) {
    const query = this.buildQuery(filters);
    return this.request(`/api/transactions/${query ? '?' + query : ''}`);
  }

  async getTransactionById(id: number): Promise<BankTransaction> {
    return this.request(`/api/transactions/${id}`);
  }

  async createTransaction(data: Partial<BankTransaction>): Promise<BankTransaction> {
    return this.request('/api/transactions/', {
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

  async getTransactionReconciliationLinks(transactionId: number): Promise<APIResponse> {
    return this.request(`/api/transactions/${transactionId}/reconciliation-links`);
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

  async exportTransactionsReconReady(format: string = 'json', limit: number = 1000): Promise<APIResponse> {
    return this.request(`/api/transactions/export/reconciliation-ready?format=${format}&limit=${limit}`);
  }

  // ===== RECONCILIATION API - COMPLETE SMART IMPLEMENTATION =====

  // Basic Reconciliation
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

  // 🔥 SMART CLIENT-BASED RECONCILIATION
  async getClientReconciliationSuggestions(
    anagraphics_id: number,
    max_suggestions: number = 10
  ): Promise<APIResponse> {
    const params = this.buildQuery({ max_suggestions });
    return this.request(`/api/reconciliation/client/${anagraphics_id}/suggestions?${params}`);
  }

  async getClientPaymentPatterns(anagraphics_id: number): Promise<APIResponse> {
    return this.request(`/api/reconciliation/client/${anagraphics_id}/patterns`);
  }

  async getClientReliabilityAnalysis(anagraphics_id: number): Promise<APIResponse> {
    return this.request(`/api/reconciliation/client/${anagraphics_id}/reliability`);
  }

  // 🔥 ADVANCED SUGGESTION ALGORITHMS
  async get1to1Suggestions(
    invoice_id?: number,
    transaction_id?: number,
    anagraphics_id_filter?: number
  ): Promise<APIResponse> {
    const params = this.buildQuery({ invoice_id, transaction_id, anagraphics_id_filter });
    return this.request(`/api/reconciliation/suggestions/1-to-1?${params}`);
  }

  async getNtoMSuggestions(
    transaction_id: number,
    anagraphics_id_filter?: number,
    max_combination_size: number = 5,
    max_search_time_ms: number = 30000,
    exclude_invoice_ids?: string,
    start_date?: string,
    end_date?: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      transaction_id,
      anagraphics_id_filter,
      max_combination_size,
      max_search_time_ms,
      exclude_invoice_ids,
      start_date,
      end_date
    });
    return this.request(`/api/reconciliation/suggestions/n-to-m?${params}`);
  }

  // Reconciliation Execution
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

  // 🔥 AI AUTO-RECONCILIATION
  async autoReconcile(
    confidence_threshold: number = 0.8, 
    max_auto_reconcile: number = 10
  ): Promise<APIResponse> {
    const params = this.buildQuery({ confidence_threshold, max_auto_reconcile });
    return this.request(`/api/reconciliation/auto-reconcile?${params}`, {
      method: 'POST',
    });
  }

  async getAutomaticMatches(confidence_level: string = 'Exact'): Promise<APIResponse> {
    const params = this.buildQuery({ confidence_level });
    return this.request(`/api/reconciliation/automatic-matches?${params}`);
  }

  // Transaction Management
  async ignoreTransaction(transaction_id: number): Promise<APIResponse> {
    return this.request(`/api/reconciliation/transaction/${transaction_id}/ignore`, {
      method: 'POST',
    });
  }

  // Undo Operations
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

  // Status & Analytics
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

  async getReconciliationAnalytics(): Promise<APIResponse> {
    return this.request('/api/reconciliation/analytics/summary');
  }

  // Validation & Rules
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

  async getMatchingRules(): Promise<APIResponse> {
    return this.request('/api/reconciliation/rules/matching');
  }

  // Manual Suggestions
  async createManualSuggestion(
    invoice_id: number,
    transaction_id: number,
    confidence: 'Alta' | 'Media' | 'Bassa',
    notes?: string
  ): Promise<APIResponse> {
    return this.request('/api/reconciliation/suggestions/manual', {
      method: 'POST',
      body: JSON.stringify({ invoice_id, transaction_id, confidence, notes }),
    });
  }

  // Dashboard
  async getReconciliationDashboard(): Promise<APIResponse> {
    return this.request('/api/reconciliation/dashboard');
  }

  // Smart Reconciliation Features
  async getSmartReconciliationOverview(): Promise<APIResponse> {
    return this.request('/api/reconciliation/smart/overview');
  }

  async getClientsWithPatterns(
    limit: number = 50,
    min_reliability_score: number = 0.0
  ): Promise<APIResponse> {
    const params = this.buildQuery({ limit, min_reliability_score });
    return this.request(`/api/reconciliation/smart/clients?${params}`);
  }

  async refreshClientPatterns(): Promise<APIResponse> {
    return this.request('/api/reconciliation/smart/refresh-patterns', {
      method: 'POST',
    });
  }

  async getSmartSuggestionsForTransaction(
    transaction_id: number,
    anagraphics_id?: number
  ): Promise<APIResponse> {
    const params = this.buildQuery({ anagraphics_id });
    return this.request(`/api/reconciliation/smart/suggestions/${transaction_id}?${params}`);
  }

  // Export & Health
  async exportReconciliationReport(
    format: 'excel' | 'csv' | 'json' = 'excel',
    period_months: number = 12,
    include_unmatched: boolean = true
  ): Promise<APIResponse> {
    const params = this.buildQuery({ format, period_months, include_unmatched });
    return this.request(`/api/reconciliation/export/report?${params}`);
  }

  async getReconciliationHealth(): Promise<APIResponse> {
    return this.request('/api/reconciliation/health-check');
  }

  // ===== ANALYTICS API - COMPLETE IMPLEMENTATION =====

  // Core Analytics & KPIs
  async getKPIs(): Promise<APIResponse> {
    return this.request('/api/analytics/kpis');
  }

  async getDashboardData(): Promise<APIResponse> {
    return this.request('/api/analytics/dashboard');
  }

  async getDetailedKPIs(): Promise<APIResponse> {
    return this.request('/api/analytics/kpis/detailed');
  }

  // Dashboard Variants
  async getExecutiveDashboard(): Promise<APIResponse> {
    return this.request('/api/analytics/dashboard/executive');
  }

  async getOperationsDashboard(): Promise<APIResponse> {
    return this.request('/api/analytics/dashboard/operations');
  }

  async getFinancialDashboard(): Promise<APIResponse> {
    return this.request('/api/analytics/dashboard/financial');
  }

  // Revenue & Profitability Analytics
  async getMonthlyRevenue(months: number = 12, invoice_type?: string): Promise<APIResponse> {
    const params = this.buildQuery({ months, invoice_type });
    return this.request(`/api/analytics/revenue/monthly?${params}`);
  }

  async getMonthlyProfitability(start_date?: string, end_date?: string): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date });
    return this.request(`/api/analytics/profitability/monthly?${params}`);
  }

  async getProfitabilityBreakdown(start_date?: string, end_date?: string): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date });
    return this.request(`/api/analytics/profitability/breakdown?${params}`);
  }

  async getRevenueTrends(period: 'monthly' | 'quarterly' = 'monthly', periods: number = 12): Promise<APIResponse> {
    return this.request(`/api/analytics/trends/revenue?period=${period}&periods=${periods}`);
  }

  async getYearOverYearComparison(metric: string = 'revenue', current_year?: number): Promise<APIResponse> {
    const params = this.buildQuery({ metric, current_year });
    return this.request(`/api/analytics/comparison/year-over-year?${params}`);
  }

  // 🔥 SEASONAL ANALYTICS - CRITICAL FOR FRUIT/VEGETABLE BUSINESS
  async getSeasonalProductAnalysis(
    product_category: string = 'all', 
    years_back: number = 3
  ): Promise<APIResponse> {
    const params = this.buildQuery({ product_category, years_back });
    return this.request(`/api/analytics/seasonality/products?${params}`);
  }

  async getSeasonalForecast(
    product_category: string = 'all', 
    months_ahead: number = 6
  ): Promise<APIResponse> {
    const params = this.buildQuery({ product_category, months_ahead });
    return this.request(`/api/analytics/seasonality/forecast?${params}`);
  }

  // 🔥 WASTE & SPOILAGE ANALYTICS - GOLD FOR PERISHABLES
  async getWasteAnalysis(start_date?: string, end_date?: string): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date });
    return this.request(`/api/analytics/waste/analysis?${params}`);
  }

  async getInventoryTurnover(start_date?: string, end_date?: string): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date });
    return this.request(`/api/analytics/inventory/turnover?${params}`);
  }

  async getInventoryAlerts(): Promise<APIResponse> {
    return this.request('/api/analytics/inventory/alerts');
  }

  // 🔥 CUSTOMER INTELLIGENCE - ADVANCED SEGMENTATION
  async getCustomerRFMAnalysis(analysis_date?: string): Promise<APIResponse> {
    const params = this.buildQuery({ analysis_date });
    return this.request(`/api/analytics/customers/rfm?${params}`);
  }

  async getCustomerChurnRisk(): Promise<APIResponse> {
    return this.request('/api/analytics/customers/churn-risk');
  }

  async getClientSegmentation(
    segmentation_type: string = 'revenue', 
    period_months: number = 12
  ): Promise<APIResponse> {
    const params = this.buildQuery({ segmentation_type, period_months });
    return this.request(`/api/analytics/segmentation/clients?${params}`);
  }

  async getTopClients(limit: number = 20, period_months: number = 12): Promise<APIResponse> {
    const params = this.buildQuery({ limit, period_months });
    return this.request(`/api/analytics/clients/top?${params}`);
  }

  async getClientPerformance(
    start_date?: string, 
    end_date?: string, 
    limit: number = 20
  ): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date, limit });
    return this.request(`/api/analytics/clients/performance?${params}`);
  }

  async getClientDetailedAnalysis(anagraphics_id: number): Promise<APIResponse> {
    return this.request(`/api/analytics/clients/${anagraphics_id}/detailed`);
  }

  async getClientsByScore(order: 'ASC' | 'DESC' = 'DESC', limit: number = 20): Promise<APIResponse> {
    const params = this.buildQuery({ order, limit });
    return this.request(`/api/analytics/clients/by-score?${params}`);
  }

  async updateClientScores(): Promise<APIResponse> {
    return this.request('/api/analytics/clients/scores/update');
  }

  async getClientFinancialSummary(anagraphics_id: number): Promise<APIResponse> {
    return this.request(`/api/analytics/clients/${anagraphics_id}/financial-summary`);
  }

  // 🔥 SUPPLIER ANALYTICS
  async getSupplierAnalysis(start_date?: string, end_date?: string): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date });
    return this.request(`/api/analytics/suppliers/analysis?${params}`);
  }

  async getTopSuppliersByCost(
    start_date?: string, 
    end_date?: string, 
    limit: number = 20
  ): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date, limit });
    return this.request(`/api/analytics/suppliers/top-by-cost?${params}`);
  }

  async getSupplierReliability(): Promise<APIResponse> {
    return this.request('/api/analytics/suppliers/reliability');
  }

  // 🔥 PRODUCT & PRICING ANALYTICS
  async getProductAnalysis(
    limit: number = 50, 
    period_months: number = 12,
    min_quantity?: number,
    invoice_type?: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({ limit, period_months, min_quantity, invoice_type });
    return this.request(`/api/analytics/products/analysis?${params}`);
  }

  async getProductMonthlySales(
    normalized_description: string,
    start_date?: string,
    end_date?: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date });
    return this.request(`/api/analytics/products/${encodeURIComponent(normalized_description)}/monthly-sales?${params}`);
  }

  async getProductComparison(
    normalized_description: string,
    year1: number,
    year2: number
  ): Promise<APIResponse> {
    const params = this.buildQuery({ year1, year2 });
    return this.request(`/api/analytics/products/${encodeURIComponent(normalized_description)}/comparison?${params}`);
  }

  async getPriceTrends(
    product_name?: string,
    start_date?: string,
    end_date?: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({ product_name, start_date, end_date });
    return this.request(`/api/analytics/pricing/trends?${params}`);
  }

  async getCompetitiveAnalysis(): Promise<APIResponse> {
    return this.request('/api/analytics/competitive/analysis');
  }

  async getCompetitiveOpportunities(): Promise<APIResponse> {
    return this.request('/api/analytics/competitive/opportunities');
  }

  // 🔥 MARKET BASKET & CROSS-SELLING
  async getMarketBasketAnalysis(
    start_date?: string,
    end_date?: string,
    min_support: number = 0.01
  ): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date, min_support });
    return this.request(`/api/analytics/market-basket/analysis?${params}`);
  }

  async getCrossSelling(): Promise<APIResponse> {
    return this.request('/api/analytics/market-basket/recommendations');
  }

  // 🔥 CASH FLOW & FINANCIAL ANALYTICS
  async getMonthlyCashFlow(months: number = 12): Promise<APIResponse> {
    return this.request(`/api/analytics/cash-flow/monthly?months=${months}`);
  }

  async getAdvancedCashFlow(start_date?: string, end_date?: string): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date });
    return this.request(`/api/analytics/cash-flow/advanced?${params}`);
  }

  async getCashFlowForecast(
    months_ahead: number = 6,
    include_scheduled: boolean = true
  ): Promise<APIResponse> {
    const params = this.buildQuery({ months_ahead, include_scheduled });
    return this.request(`/api/analytics/forecasting/cash-flow?${params}`);
  }

  async getSalesForecast(product_name?: string, months_ahead: number = 3): Promise<APIResponse> {
    const params = this.buildQuery({ product_name, months_ahead });
    return this.request(`/api/analytics/forecasting/sales?${params}`);
  }

  // 🔥 PAYMENT ANALYTICS
  async getPaymentBehavior(): Promise<APIResponse> {
    return this.request('/api/analytics/payments/behavior');
  }

  async getPaymentPerformance(): Promise<APIResponse> {
    return this.request('/api/analytics/performance/payment');
  }

  async getPaymentOptimization(): Promise<APIResponse> {
    return this.request('/api/analytics/payments/optimization');
  }

  // 🔥 AGING & OVERDUE ANALYTICS
  async getInvoicesAging(invoice_type: string = 'Attiva'): Promise<APIResponse> {
    return this.request(`/api/analytics/aging/invoices?invoice_type=${invoice_type}`);
  }

  async getOverdueInvoicesAnalysis(limit: number = 20, priority_sort: boolean = true): Promise<APIResponse> {
    const params = this.buildQuery({ limit, priority_sort });
    return this.request(`/api/analytics/overdue/invoices?${params}`);
  }

  // 🔥 CALENDAR & DUE DATES
  async getDueDatesCalendar(year: number, month: number): Promise<APIResponse> {
    return this.request(`/api/analytics/calendar/due-dates/${year}/${month}`);
  }

  async getInvoicesDueOnDate(due_date: string): Promise<APIResponse> {
    return this.request(`/api/analytics/invoices/due-on/${due_date}`);
  }

  // 🔥 COMMISSIONS & COSTS
  async getCommissionSummary(start_date?: string, end_date?: string): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date });
    return this.request(`/api/analytics/commissions/summary?${params}`);
  }

  // 🔥 BUSINESS INSIGHTS & RECOMMENDATIONS
  async getBusinessInsights(start_date?: string, end_date?: string): Promise<APIResponse> {
    const params = this.buildQuery({ start_date, end_date });
    return this.request(`/api/analytics/insights/business?${params}`);
  }

  async getExecutiveSummary(): Promise<APIResponse> {
    return this.request('/api/analytics/insights/executive-summary');
  }

  // 🔥 EXPORT & REPORTS
  async exportAnalysis(
    analysis_type: string,
    format: string = 'excel',
    start_date?: string,
    end_date?: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({ analysis_type, format, start_date, end_date });
    return this.request(`/api/analytics/export/analysis?${params}`);
  }

  async exportExecutiveReport(format: string = 'excel', include_charts: boolean = true): Promise<APIResponse> {
    const params = this.buildQuery({ format, include_charts });
    return this.request(`/api/analytics/export/executive-report?${params}`);
  }

  // 🔥 SYSTEM & UTILITIES
  async getAnalyticsHealth(): Promise<APIResponse> {
    return this.request('/api/analytics/health');
  }

  async getAnalyticsFeatures(): Promise<APIResponse> {
    return this.request('/api/analytics/features');
  }

  // ===== IMPORT/EXPORT API - COMPLETE IMPLEMENTATION =====

  // XML/P7M Import
  async importInvoicesXML(files: FileList): Promise<APIResponse> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    return this.request('/api/import-export/invoices/xml', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  async validateInvoiceFiles(files: FileList): Promise<APIResponse> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    return this.request('/api/import-export/invoices/xml/validate', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  // CSV Import
  async importTransactionsCSV(file: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/import-export/transactions/csv', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async validateTransactionsCSV(file: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/import-export/transactions/csv/validate', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async previewTransactionsCSV(file: File, max_rows: number = 10): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(`/api/import-export/transactions/csv/preview?max_rows=${max_rows}`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  // Templates
  async downloadTransactionTemplate(): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/api/import-export/templates/transactions-csv`);
    if (!response.ok) {
      throw new Error('Failed to download template');
    }
    return response.blob();
  }

  // Export Functions
  async exportInvoices(
    format: 'excel' | 'csv' | 'json' = 'excel',
    invoice_type?: string,
    status_filter?: string,
    start_date?: string,
    end_date?: string,
    include_lines: boolean = false,
    include_vat: boolean = false
  ): Promise<Blob | APIResponse> {
    const params = this.buildQuery({ 
      format, invoice_type, status_filter, start_date, end_date, include_lines, include_vat 
    });
    const response = await fetch(`${this.baseURL}/api/import-export/export/invoices?${params}`);
    
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
    status_filter?: string,
    start_date?: string,
    end_date?: string,
    include_reconciliation: boolean = false
  ): Promise<Blob | APIResponse> {
    const params = this.buildQuery({ 
      format, status_filter, start_date, end_date, include_reconciliation 
    });
    const response = await fetch(`${this.baseURL}/api/import-export/export/transactions?${params}`);
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    if (format === 'json') {
      return response.json();
    } else {
      return response.blob();
    }
  }

  async exportAnagraphics(
    format: 'excel' | 'csv' | 'json' = 'excel',
    type_filter?: string,
    include_stats: boolean = false
  ): Promise<Blob | APIResponse> {
    const params = this.buildQuery({ format, type_filter, include_stats });
    const response = await fetch(`${this.baseURL}/api/import-export/export/anagraphics?${params}`);
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    if (format === 'json') {
      return response.json();
    } else {
      return response.blob();
    }
  }

  async exportReconciliationReport(
    format: 'excel' | 'csv' | 'json' = 'excel',
    period_months: number = 12,
    include_unmatched: boolean = true
  ): Promise<Blob | APIResponse> {
    const params = this.buildQuery({ format, period_months, include_unmatched });
    const response = await fetch(`${this.baseURL}/api/import-export/export/reconciliation-report?${params}`);
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    if (format === 'json') {
      return response.json();
    } else {
      return response.blob();
    }
  }

  // Backup & Maintenance
  async createBackup(): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/api/import-export/backup/create`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Backup creation failed');
    }

    return response.blob();
  }

  async getImportHistory(limit: number = 50): Promise<APIResponse> {
    return this.request(`/api/import-export/status/import-history?limit=${limit}`);
  }

  async cleanupTempFiles(): Promise<APIResponse> {
    return this.request('/api/import-export/maintenance/cleanup', {
      method: 'POST',
    });
  }

  async getImportExportHealth(): Promise<APIResponse> {
    return this.request('/api/import-export/health-check');
  }

  async getImportExportStatistics(): Promise<APIResponse> {
    return this.request('/api/import-export/statistics');
  }

  // ===== CLOUD SYNC API - COMPLETE IMPLEMENTATION =====

  async getSyncStatus(): Promise<APIResponse> {
    return this.request('/api/sync/status');
  }

  async enableSync(): Promise<APIResponse> {
    return this.request('/api/sync/enable', {
      method: 'POST',
    });
  }

  async disableSync(): Promise<APIResponse> {
    return this.request('/api/sync/disable', {
      method: 'POST',
    });
  }

  async performManualSync(force_direction?: 'upload' | 'download'): Promise<APIResponse> {
    const params = force_direction ? `?force_direction=${force_direction}` : '';
    return this.request(`/api/sync/manual${params}`, {
      method: 'POST',
    });
  }

  async forceUpload(): Promise<APIResponse> {
    return this.request('/api/sync/upload', {
      method: 'POST',
    });
  }

  async forceDownload(): Promise<APIResponse> {
    return this.request('/api/sync/download', {
      method: 'POST',
    });
  }

  async startAutoSync(): Promise<APIResponse> {
    return this.request('/api/sync/auto-sync/start', {
      method: 'POST',
    });
  }

  async stopAutoSync(): Promise<APIResponse> {
    return this.request('/api/sync/auto-sync/stop', {
      method: 'POST',
    });
  }

  async updateAutoSyncInterval(interval_seconds: number): Promise<APIResponse> {
    return this.request(`/api/sync/auto-sync/interval?interval_seconds=${interval_seconds}`, {
      method: 'PUT',
    });
  }

  async getSyncHistory(limit: number = 20): Promise<APIResponse> {
    return this.request(`/api/sync/history?limit=${limit}`);
  }

  async getRemoteFileInfo(): Promise<APIResponse> {
    return this.request('/api/sync/remote-info');
  }

  async deleteRemoteFile(): Promise<APIResponse> {
    return this.request('/api/sync/remote-file', {
      method: 'DELETE',
    });
  }

  async testGoogleDriveConnection(): Promise<APIResponse> {
    return this.request('/api/sync/test-connection', {
      method: 'POST',
    });
  }

  async getSyncConfiguration(): Promise<APIResponse> {
    return this.request('/api/sync/config');
  }

  async getCredentialsSetupGuide(): Promise<APIResponse> {
    return this.request('/api/sync/setup-credentials', {
      method: 'POST',
    });
  }

  async resetAuthorization(): Promise<APIResponse> {
    return this.request('/api/sync/reset-authorization', {
      method: 'POST',
    });
  }

  async getSyncHealth(): Promise<APIResponse> {
    return this.request('/api/sync/health');
  }

  async getSyncMetrics(): Promise<APIResponse> {
    return this.request('/api/sync/metrics');
  }

  async forceBackup(): Promise<APIResponse> {
    return this.request('/api/sync/force-backup', {
      method: 'POST',
    });
  }

  // ===== UTILITIES & TESTING =====

  // Test di connessione completo
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  // Test API completo
  async runFullAPITest(): Promise<{
    success: boolean;
    results: Record<string, boolean>;
    details: Record<string, any>;
  }> {
    const tests = {
      health: false,
      first_run: false,
      anagraphics: false,
      invoices: false,
      transactions: false,
      reconciliation: false,
      analytics: false,
      import_export: false,
      sync: false
    };

    const details: Record<string, any> = {};

    try {
      // Test Health
      const health = await this.healthCheck();
      tests.health = true;
      details.health = health;
    } catch (error) {
      details.health = { error: error.message };
    }

    try {
      // Test First Run
      const firstRun = await this.checkFirstRun();
      tests.first_run = true;
      details.first_run = firstRun;
    } catch (error) {
      details.first_run = { error: error.message };
    }

    try {
      // Test Anagraphics
      const anagraphics = await this.getAnagraphics({ page: 1, size: 1 });
      tests.anagraphics = true;
      details.anagraphics = { count: anagraphics.total || 0 };
    } catch (error) {
      details.anagraphics = { error: error.message };
    }

    try {
      // Test Invoices
      const invoices = await this.getInvoices({ page: 1, size: 1 });
      tests.invoices = true;
      details.invoices = { count: invoices.total || 0 };
    } catch (error) {
      details.invoices = { error: error.message };
    }

    try {
      // Test Transactions
      const transactions = await this.getTransactions({ page: 1, size: 1 });
      tests.transactions = true;
      details.transactions = { count: transactions.total || 0 };
    } catch (error) {
      details.transactions = { error: error.message };
    }

    try {
      // Test Reconciliation
      const reconciliation = await this.getReconciliationStatus();
      tests.reconciliation = true;
      details.reconciliation = reconciliation;
    } catch (error) {
      details.reconciliation = { error: error.message };
    }

    try {
      // Test Analytics
      const analytics = await this.getKPIs();
      tests.analytics = true;
      details.analytics = analytics;
    } catch (error) {
      details.analytics = { error: error.message };
    }

    try {
      // Test Import/Export
      const importExport = await this.getImportExportHealth();
      tests.import_export = true;
      details.import_export = importExport;
    } catch (error) {
      details.import_export = { error: error.message };
    }

    try {
      // Test Sync
      const sync = await this.getSyncStatus();
      tests.sync = true;
      details.sync = sync;
    } catch (error) {
      details.sync = { error: error.message };
    }

    const successCount = Object.values(tests).filter(Boolean).length;
    const totalTests = Object.keys(tests).length;

    return {
      success: successCount === totalTests,
      results: tests,
      details: {
        ...details,
        summary: {
          passed: successCount,
          total: totalTests,
          success_rate: `${((successCount / totalTests) * 100).toFixed(1)}%`
        }
      }
    };
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Export helper per testare la connessione
export const testBackendConnection = async (): Promise<{
  connected: boolean;
  message: string;
  details?: any;
}> => {
  try {
    const health = await apiClient.healthCheck();
    return {
      connected: true,
      message: 'Backend connesso con successo',
      details: health
    };
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Errore di connessione',
      details: error
    };
  }
};

// Export helper per test completo
export const runCompleteAPITest = async () => {
  return await apiClient.runFullAPITest();
};

// Export constants
export const API_ENDPOINTS = {
  HEALTH: '/health',
  FIRST_RUN: '/api/first-run',
  SETUP: '/api/setup',
  ANAGRAPHICS: '/api/anagraphics',
  INVOICES: '/api/invoices',
  TRANSACTIONS: '/api/transactions',
  RECONCILIATION: '/api/reconciliation',
  ANALYTICS: '/api/analytics',
  IMPORT_EXPORT: '/api/import-export',
  SYNC: '/api/sync'
} as const;

// Export types for better TypeScript support
export type APIEndpointCategory = keyof typeof API_ENDPOINTS;

// Default export
export default apiClient;
