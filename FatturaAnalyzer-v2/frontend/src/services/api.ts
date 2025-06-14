/**
 * ULTRA API Client V4.0 for FatturaAnalyzer Backend
 * Completamente aggiornato per supportare:
 * - Analytics API Ultra-Ottimizzata V3.0 con AI/ML
 * - Reconciliation API V4.0 con Smart Features
 * - Transactions API V4.0 con Enhanced Capabilities
 * - First Run & Setup Wizard completo
 * - Import/Export completo con validazione
 * - Cloud Sync con Google Drive
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

// ===== ANALYTICS V4.0 INTERFACES =====
export interface AnalyticsRequest {
  analysis_type: string;
  parameters?: Record<string, any>;
  cache_enabled?: boolean;
  include_predictions?: boolean;
  output_format?: 'json' | 'excel' | 'csv' | 'pdf';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface BatchAnalyticsRequest {
  requests: AnalyticsRequest[];
  parallel_execution?: boolean;
  timeout_seconds?: number;
}

// ===== RECONCILIATION V4.0 INTERFACES =====
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

    if (import.meta.env.DEV) {
      console.log('🚀 API Request V4.0:', options.method || 'GET', endpoint);
    }

    try {
      const response = await fetch(url, {
        headers: { ...defaultHeaders, ...options.headers },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        
        console.error('❌ API Error V4.0:', response.status, endpoint, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (import.meta.env.DEV) {
        console.log('✅ API Response V4.0:', response.status, endpoint);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🔌 Backend V4.0 connection failed. Backend running at:', this.baseURL);
        throw new Error('Backend V4.0 non raggiungibile. Verifica che sia in esecuzione.');
      }
      throw error;
    }
  }

  private buildQuery(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          searchParams.append(key, value.join(','));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    return searchParams.toString();
  }

  // ===== HEALTH CHECK =====
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request('/health');
  }

  // ===== FIRST RUN & SETUP API COMPLETO =====
  
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

  async forceResetFirstRun(): Promise<APIResponse> {
    return this.request('/api/first-run/force-reset', { method: 'POST' });
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
      headers: {},
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

  async testXMLExtraction(xmlContent: string, invoiceType: string): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('xml_content', xmlContent);
    formData.append('invoice_type', invoiceType);
    
    return this.request('/api/setup/test-xml-extraction', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  // ===== ANAGRAPHICS API ENHANCED =====
  
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

  async searchAnagraphics(query: string, type_filter?: string, limit: number = 10): Promise<APIResponse> {
    const params = this.buildQuery({ type_filter, limit });
    return this.request(`/api/anagraphics/search/${encodeURIComponent(query)}${params ? '?' + params : ''}`);
  }

  async getAnagraphicsStats(): Promise<APIResponse> {
    return this.request('/api/anagraphics/stats/summary');
  }

  async validatePIVA(piva: string): Promise<APIResponse> {
    return this.request(`/api/anagraphics/validate/piva/${encodeURIComponent(piva)}`);
  }

  async validateCodiceFiscale(cf: string): Promise<APIResponse> {
    return this.request(`/api/anagraphics/validate/cf/${encodeURIComponent(cf)}`);
  }

  async exportAnagraphicsQuick(format: 'csv' | 'json' = 'json', type_filter?: string): Promise<APIResponse> {
    const params = this.buildQuery({ format, type_filter });
    return this.request(`/api/anagraphics/export/${format}${params ? '?' + params : ''}`);
  }

  async bulkUpdateClientScores(): Promise<APIResponse> {
    return this.request('/api/anagraphics/bulk/update-scores', { method: 'POST' });
  }

  async checkPotentialDuplicates(): Promise<APIResponse> {
    return this.request('/api/anagraphics/duplicates/check');
  }

  async importAnagraphicsFromCSV(file: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request('/api/anagraphics/import/csv', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async batchCreateAnagraphics(anagraphicsList: Partial<Anagraphics>[]): Promise<APIResponse> {
    return this.request('/api/anagraphics/batch/create', {
      method: 'POST',
      body: JSON.stringify(anagraphicsList),
    });
  }

  async mergeAnagraphics(sourceId: number, targetId: number): Promise<APIResponse> {
    return this.request(`/api/anagraphics/merge/${sourceId}/${targetId}`, {
      method: 'POST',
    });
  }

  async getProvincesList(): Promise<APIResponse> {
    return this.request('/api/anagraphics/provinces/list');
  }

  async getTopClientsAnalytics(limit: number = 20, periodMonths: number = 12): Promise<APIResponse> {
    const params = this.buildQuery({ limit, period_months: periodMonths });
    return this.request(`/api/anagraphics/analytics/top-clients?${params}`);
  }

  async getAnagraphicsHealthCheck(): Promise<APIResponse> {
    return this.request('/api/anagraphics/health-check');
  }

  // ===== INVOICES API ENHANCED =====
  
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

  async searchInvoices(query: string, type_filter?: string, limit: number = 10): Promise<APIResponse> {
    const params = this.buildQuery({ type_filter, limit });
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

  // ===== TRANSACTIONS API V4.0 ULTRA-ENHANCED =====
  
  async getTransactions(filters: TransactionFilters = {}) {
    const query = this.buildQuery(filters);
    return this.request(`/api/transactions/${query ? '?' + query : ''}`);
  }

  async getTransactionById(
    id: number, 
    enhanced: boolean = false, 
    include_suggestions: boolean = false,
    include_similar: boolean = false
  ): Promise<BankTransaction> {
    const params = this.buildQuery({ enhanced, include_suggestions, include_similar });
    return this.request(`/api/transactions/${id}${params ? '?' + params : ''}`);
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

  async deleteTransaction(id: number, confirm: boolean = true): Promise<APIResponse> {
    return this.request(`/api/transactions/${id}?confirm=${confirm}`, {
      method: 'DELETE',
    });
  }

  // 🔥 NEW V4.0 SMART SUGGESTIONS
  async getSmartReconciliationSuggestions(
    transactionId: number,
    anagraphicsHint?: number,
    enableAI: boolean = true,
    enableSmartPatterns: boolean = true,
    enablePredictive: boolean = true,
    maxSuggestions: number = 10,
    confidenceThreshold: number = 0.6
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      anagraphics_hint: anagraphicsHint,
      enable_ai: enableAI,
      enable_smart_patterns: enableSmartPatterns,
      enable_predictive: enablePredictive,
      max_suggestions: maxSuggestions,
      confidence_threshold: confidenceThreshold
    });
    return this.request(`/api/transactions/${transactionId}/smart-suggestions?${params}`);
  }

  // 🔥 NEW V4.0 MANUAL RECONCILIATION WITH AI
  async reconcileTransactionWithInvoice(
    transactionId: number,
    invoiceId: number,
    amountToMatch: number,
    enableAIValidation: boolean = true,
    enableLearning: boolean = true,
    userConfidence?: number,
    userNotes?: string,
    forceMatch: boolean = false
  ): Promise<APIResponse> {
    return this.request(`/api/transactions/${transactionId}/reconcile-with/${invoiceId}`, {
      method: 'POST',
      body: JSON.stringify({
        amount_to_match: amountToMatch,
        enable_ai_validation: enableAIValidation,
        enable_learning: enableLearning,
        user_confidence: userConfidence,
        user_notes: userNotes,
        force_match: forceMatch
      }),
    });
  }

  // 🔥 NEW V4.0 BATCH OPERATIONS
  async batchReconcileTransactions(batchRequest: BatchReconciliationRequest): Promise<APIResponse> {
    return this.request('/api/transactions/batch/reconcile', {
      method: 'POST',
      body: JSON.stringify(batchRequest),
    });
  }

  async batchUpdateTransactionStatus(
    transactionIds: number[], 
    reconciliationStatus: string,
    enhanced: boolean = false,
    forceBackground: boolean = false,
    enableSmartValidation: boolean = true
  ): Promise<APIResponse> {
    return this.request('/api/transactions/batch/update-status', {
      method: 'POST',
      body: JSON.stringify({
        transaction_ids: transactionIds,
        reconciliation_status: reconciliationStatus
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Enhanced': enhanced.toString(),
        'X-Force-Background': forceBackground.toString(),
        'X-Smart-Validation': enableSmartValidation.toString()
      }
    });
  }

  // 🔥 NEW V4.0 TRANSACTION INSIGHTS
  async getTransactionInsights(
    transactionId: number,
    includeAIAnalysis: boolean = true,
    includePatternMatching: boolean = true,
    includeClientAnalysis: boolean = true,
    includeSmartSuggestions: boolean = false
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      include_ai_analysis: includeAIAnalysis,
      include_pattern_matching: includePatternMatching,
      include_client_analysis: includeClientAnalysis,
      include_smart_suggestions: includeSmartSuggestions
    });
    return this.request(`/api/transactions/${transactionId}/insights?${params}`);
  }

  // 🔥 NEW V4.0 BATCH TASK STATUS
  async getBatchTaskStatus(taskId: string): Promise<APIResponse> {
    return this.request(`/api/transactions/batch/status/${taskId}`);
  }

  // 🔥 NEW V4.0 SEARCH ENHANCED
  async searchTransactions(
    query: string, 
    limit: number = 10,
    includeReconciled: boolean = false,
    searchMode: 'smart' | 'exact' | 'fuzzy' | 'ai_enhanced' = 'smart',
    enhancedResults: boolean = false,
    enableClientMatching: boolean = false
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      limit,
      include_reconciled: includeReconciled,
      search_mode: searchMode,
      enhanced_results: enhancedResults,
      enable_client_matching: enableClientMatching
    });
    return this.request(`/api/transactions/search/${encodeURIComponent(query)}?${params}`);
  }

  // 🔥 NEW V4.0 STATISTICS ULTRA
  async getTransactionStatsV4(
    useCache: boolean = true,
    includeTrends: boolean = false,
    includeAIInsights: boolean = false,
    periodMonths: number = 12
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      use_cache: useCache,
      include_trends: includeTrends,
      include_ai_insights: includeAIInsights,
      period_months: periodMonths
    });
    return this.request(`/api/transactions/stats/summary?${params}`);
  }

  // Original methods mantained for compatibility
  async getTransactionStats(): Promise<APIResponse> {
    return this.getTransactionStatsV4();
  }

  async getCashFlowAnalysis(months: number = 12): Promise<APIResponse> {
    return this.request(`/api/transactions/analysis/cash-flow?months=${months}`);
  }

  // 🔥 NEW V4.0 HEALTH & METRICS
  async getTransactionHealthV4(): Promise<APIResponse> {
    return this.request('/api/transactions/health');
  }

  async getTransactionMetricsV4(): Promise<APIResponse> {
    return this.request('/api/transactions/metrics');
  }

  // ===== RECONCILIATION API V4.0 ULTRA =====

  // 🔥 ULTRA SMART SUGGESTIONS V4.0
  async getUltraSmartSuggestions(request: UltraReconciliationRequest): Promise<APIResponse> {
    return this.request('/api/reconciliation/ultra/smart-suggestions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 🔥 MANUAL MATCH V4.0 WITH AI
  async applyManualMatchV4(request: ManualMatchRequest): Promise<APIResponse> {
    return this.request('/api/reconciliation/manual-match', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 🔥 BATCH PROCESSING V4.0
  async processBatchReconciliationV4(request: BatchReconciliationRequest): Promise<APIResponse> {
    return this.request('/api/reconciliation/batch/ultra-processing', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 🔥 SYSTEM STATUS V4.0
  async getReconciliationSystemStatus(): Promise<APIResponse> {
    return this.request('/api/reconciliation/system/status');
  }

  async getReconciliationVersionInfo(): Promise<APIResponse> {
    return this.request('/api/reconciliation/system/version');
  }

  async getReconciliationPerformanceMetrics(): Promise<APIResponse> {
    return this.request('/api/reconciliation/system/performance');
  }

  // 🔥 CLIENT RELIABILITY V4.0
  async getClientPaymentReliabilityV4(
    anagraphicsId: number,
    includePredictions: boolean = true,
    includePatternAnalysis: boolean = true,
    enhancedInsights: boolean = true
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      include_predictions: includePredictions,
      include_pattern_analysis: includePatternAnalysis,
      enhanced_insights: enhancedInsights
    });
    return this.request(`/api/reconciliation/client/reliability/${anagraphicsId}?${params}`);
  }

  // 🔥 AUTOMATIC MATCHING V4.0
  async getAutomaticMatchingOpportunitiesV4(
    confidenceLevel: 'Exact' | 'High' | 'Medium' | 'Low' = 'High',
    maxOpportunities: number = 50,
    enableAIFiltering: boolean = true,
    enableRiskAssessment: boolean = true,
    prioritizeHighValue: boolean = true
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      confidence_level: confidenceLevel,
      max_opportunities: maxOpportunities,
      enable_ai_filtering: enableAIFiltering,
      enable_risk_assessment: enableRiskAssessment,
      prioritize_high_value: prioritizeHighValue
    });
    return this.request(`/api/reconciliation/automatic/opportunities?${params}`);
  }

  // Original reconciliation methods maintained for compatibility
  async getReconciliationSuggestions(
    max_suggestions: number = 50, 
    confidence_threshold: number = 0.5
  ): Promise<APIResponse> {
    return this.getUltraSmartSuggestions({
      operation_type: 'auto',
      max_suggestions,
      confidence_threshold
    });
  }

  async getReconciliationOpportunities(
    limit: number = 20, 
    amount_tolerance: number = 0.01
  ): Promise<APIResponse> {
    return this.getAutomaticMatchingOpportunitiesV4('High', limit);
  }

  async performReconciliation(
    invoice_id: number, 
    transaction_id: number, 
    amount: number
  ): Promise<APIResponse> {
    return this.applyManualMatchV4({
      invoice_id,
      transaction_id,
      amount_to_match: amount,
      enable_ai_validation: true,
      enable_learning: true
    });
  }

  async performBatchReconciliation(reconciliations: Array<{
    invoice_id: number;
    transaction_id: number;
    amount: number;
  }>): Promise<APIResponse> {
    return this.processBatchReconciliationV4({
      reconciliation_pairs: reconciliations,
      enable_ai_validation: true,
      enable_parallel_processing: true
    });
  }

  async getReconciliationStatus(): Promise<APIResponse> {
    return this.getReconciliationSystemStatus();
  }

  async getReconciliationHealth(): Promise<APIResponse> {
    return this.request('/api/reconciliation/health-check');
  }

  // ===== ANALYTICS API V3.0 ULTRA =====

  // 🔥 EXECUTIVE DASHBOARD ULTRA
  async getExecutiveDashboardUltra(
    includePredictions: boolean = false,
    includeAIInsights: boolean = true,
    cacheEnabled: boolean = true,
    realTime: boolean = false
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      include_predictions: includePredictions,
      include_ai_insights: includeAIInsights,
      cache_enabled: cacheEnabled,
      real_time: realTime
    });
    return this.request(`/api/analytics/dashboard/executive?${params}`);
  }

  // 🔥 OPERATIONS DASHBOARD LIVE
  async getOperationsDashboardLive(
    autoRefreshSeconds: number = 30,
    includeAlerts: boolean = true,
    alertPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      auto_refresh_seconds: autoRefreshSeconds,
      include_alerts: includeAlerts,
      alert_priority: alertPriority
    });
    return this.request(`/api/analytics/dashboard/operations/live?${params}`);
  }

  // 🔥 AI BUSINESS INSIGHTS
  async getAIBusinessInsights(
    analysisDepth: 'quick' | 'standard' | 'deep' = 'standard',
    focusAreas?: string,
    includeRecommendations: boolean = true,
    language: 'it' | 'en' = 'it'
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      analysis_depth: analysisDepth,
      focus_areas: focusAreas,
      include_recommendations: includeRecommendations,
      language
    });
    return this.request(`/api/analytics/ai/business-insights?${params}`);
  }

  // 🔥 CUSTOM AI ANALYSIS
  async runCustomAIAnalysis(request: AnalyticsRequest): Promise<APIResponse> {
    return this.request('/api/analytics/ai/custom-analysis', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 🔥 SEASONALITY ULTRA ANALYSIS
  async getUltraSeasonalityAnalysis(
    yearsBack: number = 3,
    includeWeatherCorrelation: boolean = false,
    predictMonthsAhead: number = 6,
    confidenceLevel: number = 0.95,
    categoryFocus?: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      years_back: yearsBack,
      include_weather_correlation: includeWeatherCorrelation,
      predict_months_ahead: predictMonthsAhead,
      confidence_level: confidenceLevel,
      category_focus: categoryFocus
    });
    return this.request(`/api/analytics/seasonality/ultra-analysis?${params}`);
  }

  // 🔥 CUSTOMER ULTRA INTELLIGENCE
  async getUltraCustomerIntelligence(
    analysisDepth: 'basic' | 'standard' | 'comprehensive' | 'expert' = 'comprehensive',
    includePredictiveLTV: boolean = true,
    includeChurnPrediction: boolean = true,
    includeNextBestAction: boolean = true,
    segmentGranularity: 'basic' | 'detailed' | 'micro' = 'detailed'
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      analysis_depth: analysisDepth,
      include_predictive_ltv: includePredictiveLTV,
      include_churn_prediction: includeChurnPrediction,
      include_next_best_action: includeNextBestAction,
      segment_granularity: segmentGranularity
    });
    return this.request(`/api/analytics/customers/ultra-intelligence?${params}`);
  }

  // 🔥 COMPETITIVE MARKET POSITION
  async getCompetitiveMarketPosition(
    benchmarkAgainst: 'industry' | 'local' | 'premium' = 'industry',
    includePriceAnalysis: boolean = true,
    includeMarginOptimization: boolean = true,
    marketScope: 'local' | 'regional' | 'national' = 'regional'
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      benchmark_against: benchmarkAgainst,
      include_price_analysis: includePriceAnalysis,
      include_margin_optimization: includeMarginOptimization,
      market_scope: marketScope
    });
    return this.request(`/api/analytics/competitive/market-position?${params}`);
  }

  // 🔥 BATCH ULTRA ANALYTICS
  async processBatchUltraAnalytics(request: BatchAnalyticsRequest): Promise<APIResponse> {
    return this.request('/api/analytics/batch/ultra-analytics', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 🔥 ULTRA REPORT EXPORT
  async exportUltraAnalyticsReport(
    reportType: 'executive' | 'operational' | 'comprehensive' | 'custom' = 'comprehensive',
    format: 'excel' | 'pdf' | 'json' | 'csv' = 'excel',
    includeAIInsights: boolean = true,
    includePredictions: boolean = true,
    includeRecommendations: boolean = true,
    customSections?: string,
    language: 'it' | 'en' = 'it'
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      report_type: reportType,
      format,
      include_ai_insights: includeAIInsights,
      include_predictions: includePredictions,
      include_recommendations: includeRecommendations,
      custom_sections: customSections,
      language
    });
    return this.request(`/api/analytics/export/ultra-report?${params}`);
  }

  // 🔥 REAL-TIME LIVE METRICS
  async getRealtimeLiveMetrics(
    metrics: string = 'all',
    refreshRate: number = 10,
    includeAlerts: boolean = true
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      metrics,
      refresh_rate: refreshRate,
      include_alerts: includeAlerts
    });
    return this.request(`/api/analytics/realtime/live-metrics?${params}`);
  }

  // 🔥 ULTRA PREDICTIONS
  async getUltraPredictions(
    predictionHorizon: number = 12,
    confidenceIntervals: boolean = true,
    scenarioAnalysis: boolean = true,
    externalFactors: boolean = false,
    modelEnsemble: boolean = true
  ): Promise<APIResponse> {
    const params = this.buildQuery({
      prediction_horizon: predictionHorizon,
      confidence_intervals: confidenceIntervals,
      scenario_analysis: scenarioAnalysis,
      external_factors: externalFactors,
      model_ensemble: modelEnsemble
    });
    return this.request(`/api/analytics/forecasting/ultra-predictions?${params}`);
  }

  // 🔥 SYSTEM HEALTH ULTRA
  async getUltraSystemHealth(): Promise<APIResponse> {
    return this.request('/api/analytics/system/ultra-health');
  }

  async getUltraAnalyticsFeatures(): Promise<APIResponse> {
    return this.request('/api/analytics/system/ultra-features');
  }

  // Original Analytics methods maintained for compatibility
  async getKPIs(): Promise<APIResponse> {
    return this.getExecutiveDashboardUltra();
  }

  async getDashboardData(): Promise<APIResponse> {
    return this.getExecutiveDashboardUltra();
  }

  async getDetailedKPIs(): Promise<APIResponse> {
    return this.getExecutiveDashboardUltra(false, true);
  }

  async getExecutiveDashboard(): Promise<APIResponse> {
    return this.getExecutiveDashboardUltra();
  }

  async getOperationsDashboard(): Promise<APIResponse> {
    return this.getOperationsDashboardLive();
  }

  async getAnalyticsHealth(): Promise<APIResponse> {
    return this.getUltraSystemHealth();
  }

  async getAnalyticsFeatures(): Promise<APIResponse> {
    return this.getUltraAnalyticsFeatures();
  }

  // ===== IMPORT/EXPORT API COMPLETO =====

  // XML/P7M Import
  async importInvoicesXML(files: FileList): Promise<APIResponse> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    return this.request('/api/import-export/invoices/xml', {
      method: 'POST',
      body: formData,
      headers: {},
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

  async previewTransactionsCSV(file: File, maxRows: number = 10): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(`/api/import-export/transactions/csv/preview?max_rows=${maxRows}`, {
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

  async getSupportedFormats(): Promise<APIResponse> {
    return this.request('/api/import-export/supported-formats');
  }

  async validateBatchFiles(files: FileList): Promise<APIResponse> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    return this.request('/api/import-export/validate/batch', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  // ===== CLOUD SYNC API COMPLETO =====

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

  // ===== UTILITIES & TESTING V4.0 =====

  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('Backend V4.0 connection test failed:', error);
      return false;
    }
  }

  async runFullAPITestV4(): Promise<{
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
      reconciliation_v4: false,
      analytics_v3: false,
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
      // Test Anagraphics Enhanced
      const anagraphics = await this.getAnagraphics({ page: 1, size: 1 });
      tests.anagraphics = true;
      details.anagraphics = { count: anagraphics.total || 0 };
    } catch (error) {
      details.anagraphics = { error: error.message };
    }

    try {
      // Test Invoices Enhanced
      const invoices = await this.getInvoices({ page: 1, size: 1 });
      tests.invoices = true;
      details.invoices = { count: invoices.total || 0 };
    } catch (error) {
      details.invoices = { error: error.message };
    }

    try {
      // Test Transactions V4.0
      const transactions = await this.getTransactions({ page: 1, size: 1, enhanced: true });
      tests.transactions = true;
      details.transactions = { count: transactions.total || 0, v4_enhanced: true };
    } catch (error) {
      details.transactions = { error: error.message };
    }

    try {
      // Test Reconciliation V4.0
      const reconciliation = await this.getReconciliationSystemStatus();
      tests.reconciliation_v4 = true;
      details.reconciliation_v4 = { ...reconciliation, version: '4.0' };
    } catch (error) {
      details.reconciliation_v4 = { error: error.message };
    }

    try {
      // Test Analytics V3.0 Ultra
      const analytics = await this.getUltraSystemHealth();
      tests.analytics_v3 = true;
      details.analytics_v3 = { ...analytics, version: '3.0' };
    } catch (error) {
      details.analytics_v3 = { error: error.message };
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
          success_rate: `${((successCount / totalTests) * 100).toFixed(1)}%`,
          version: 'API Client V4.0',
          backend_features: [
            'Ultra-Optimized Analytics V3.0',
            'Smart Reconciliation V4.0', 
            'Enhanced Transactions V4.0',
            'AI/ML Insights',
            'Complete First Run Wizard',
            'Advanced Import/Export',
            'Cloud Sync with Google Drive'
          ]
        }
      }
    };
  }

  // Legacy method maintained for compatibility
  async runFullAPITest(): Promise<{
    success: boolean;
    results: Record<string, boolean>;
    details: Record<string, any>;
  }> {
    return this.runFullAPITestV4();
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Export helper per testare la connessione V4.0
export const testBackendConnectionV4 = async (): Promise<{
  connected: boolean;
  message: string;
  details?: any;
}> => {
  try {
    const health = await apiClient.healthCheck();
    return {
      connected: true,
      message: 'Backend V4.0 connesso con successo - Ultra-Optimized Features Active',
      details: { 
        ...health, 
        api_version: 'V4.0',
        features: ['AI/ML Analytics', 'Smart Reconciliation', 'Enhanced Transactions']
      }
    };
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Errore di connessione V4.0',
      details: error
    };
  }
};

// Export helper per test completo V4.0
export const runCompleteAPITestV4 = async () => {
  return await apiClient.runFullAPITestV4();
};

// Legacy helpers maintained for compatibility
export const testBackendConnection = testBackendConnectionV4;
export const runCompleteAPITest = runCompleteAPITestV4;

// Export constants V4.0
export const API_ENDPOINTS_V4 = {
  HEALTH: '/health',
  FIRST_RUN: '/api/first-run',
  SETUP: '/api/setup',
  ANAGRAPHICS: '/api/anagraphics',
  INVOICES: '/api/invoices',
  TRANSACTIONS: '/api/transactions', // V4.0 Enhanced
  RECONCILIATION: '/api/reconciliation', // V4.0 Ultra
  ANALYTICS: '/api/analytics', // V3.0 Ultra-Optimized
  IMPORT_EXPORT: '/api/import-export',
  SYNC: '/api/sync'
} as const;

// Export feature flags V4.0
export const FEATURES_V4 = {
  AI_INSIGHTS: true,
  SMART_RECONCILIATION: true,
  ULTRA_ANALYTICS: true,
  ENHANCED_TRANSACTIONS: true,
  PREDICTIVE_SCORING: true,
  PATTERN_LEARNING: true,
  REAL_TIME_METRICS: true,
  ADVANCED_EXPORT: true,
  CLOUD_SYNC: true,
  SETUP_WIZARD: true
} as const;

// Export types for better TypeScript support
export type APIEndpointCategoryV4 = keyof typeof API_ENDPOINTS_V4;
export type FeatureV4 = keyof typeof FEATURES_V4;

// Default export
export default apiClient;
