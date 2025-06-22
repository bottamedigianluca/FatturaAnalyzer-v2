/**
 * ENTERPRISE API Client V4.0 for FatturaAnalyzer Backend - PRODUCTION VERSION FINALE
 * Versione definitiva per ambiente enterprise senza dati simulati
 *
 * CORREZIONI V4.0:
 * - URL encoding corretto per query parameters
 * - Gestione errori enterprise-grade senza mock data
 * - Fallback solo per endpoint alternativi reali
 * - Logging appropriato per debugging
 * - Compatibilità con hook esistenti
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
          // Proper array encoding
          searchParams.append(key, value.join(','));
        } else {
          // Proper URL encoding for special characters
          searchParams.append(key, String(value));
        }
      }
    });

    return searchParams.toString();
  }

  // ===== HTTP HELPER METHODS =====

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const query = params ? this.buildQuery(params) : '';
    return this.request<T>(`${endpoint}${query ? '?' + query : ''}`);
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const requestOptions: RequestInit = {
      method: 'POST',
      ...options,
    };

    // Handle different data types
    if (data instanceof FormData) {
      // Don't set Content-Type for FormData, let browser set it with boundary
      const { 'Content-Type': _, ...headersWithoutContentType } = requestOptions.headers as Record<string, string> || {};
      requestOptions.headers = headersWithoutContentType;
      requestOptions.body = data;
    } else if (data) {
      requestOptions.body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, requestOptions);
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const requestOptions: RequestInit = {
      method: 'PUT',
      ...options,
    };

    if (data instanceof FormData) {
      const { 'Content-Type': _, ...headersWithoutContentType } = requestOptions.headers as Record<string, string> || {};
      requestOptions.headers = headersWithoutContentType;
      requestOptions.body = data;
    } else if (data) {
      requestOptions.body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, requestOptions);
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // ===== HEALTH CHECK =====
  async healthCheck(): Promise<{
    status: string;
    version: string;
    database?: string;
    core_integration?: string;
    first_run_required?: boolean;
  }> {
    try {
      const response = await this.request('/health');

      // Adatta la response per compatibilità con SystemHealthProvider
      return {
        status: response.status || 'unknown',
        version: response.version || '4.0',
        database: response.database_status || response.database || 'connected',
        core_integration: response.core_integration_status || response.core_integration || 'operational',
        first_run_required: response.first_run_required || false,
        ...response // Include tutti gli altri campi se presenti
      };
    } catch (error) {
      // In caso di errore, restituisci uno stato di fallimento
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        version: '4.0',
        database: 'disconnected',
        core_integration: 'failed',
        first_run_required: false
      };
    }
  }

  // ===== FIRST RUN & SETUP API =====

  async checkFirstRun(): Promise<APIResponse> {
    try {
      return await this.request('/api/first-run/check');
    } catch (error) {
      // Prova endpoint alternativo
      try {
        return await this.request('/first-run/check');
      } catch (fallbackError) {
        throw new Error('Impossibile verificare lo stato di prima configurazione. Verificare la connessione al backend.');
      }
    }
  }

  async startSetupWizard(): Promise<APIResponse> {
    try {
      return await this.post('/api/first-run/wizard/start');
    } catch (error) {
      throw new Error('Impossibile avviare il wizard di configurazione. Funzionalità non disponibile.');
    }
  }

  async setupDatabase(): Promise<APIResponse> {
    try {
      return await this.post('/api/first-run/wizard/database-setup');
    } catch (error) {
      throw new Error('Impossibile configurare il database. Funzionalità non disponibile.');
    }
  }

  async completeSetupWizard(): Promise<APIResponse> {
    try {
      return await this.post('/api/first-run/wizard/complete');
    } catch (error) {
      throw new Error('Impossibile completare la configurazione. Funzionalità non disponibile.');
    }
  }

  async getWizardStatus(): Promise<APIResponse> {
    try {
      return await this.request('/api/first-run/wizard/status');
    } catch (error) {
      throw new Error('Impossibile ottenere lo stato del wizard. Funzionalità non disponibile.');
    }
  }

  async skipWizard(): Promise<APIResponse> {
    try {
      return await this.post('/api/first-run/wizard/skip');
    } catch (error) {
      throw new Error('Impossibile saltare il wizard. Funzionalità non disponibile.');
    }
  }

  async getSystemInfo(): Promise<APIResponse> {
    try {
      return await this.request('/api/system/info');
    } catch (error) {
      throw new Error('Impossibile ottenere informazioni di sistema. Funzionalità non disponibile.');
    }
  }

  async testDatabaseConnection(): Promise<APIResponse> {
    try {
      return await this.post('/api/first-run/wizard/test-database');
    } catch (error) {
      throw new Error('Impossibile testare la connessione al database. Funzionalità non disponibile.');
    }
  }

  async generateSampleData(): Promise<APIResponse> {
    try {
      return await this.post('/api/first-run/wizard/generate-sample-data');
    } catch (error) {
      throw new Error('Impossibile generare dati di esempio. Funzionalità non disponibile.');
    }
  }

  async getWizardSteps(): Promise<APIResponse> {
    try {
      return await this.request('/api/first-run/wizard/steps');
    } catch (error) {
      throw new Error('Impossibile ottenere i passi del wizard. Funzionalità non disponibile.');
    }
  }

  async getFirstRunHealth(): Promise<APIResponse> {
    try {
      return await this.request('/api/first-run/health');
    } catch (error) {
      throw new Error('Impossibile verificare lo stato del sistema. Funzionalità non disponibile.');
    }
  }

  async forceResetFirstRun(): Promise<APIResponse> {
    try {
      return await this.post('/api/first-run/force-reset');
    } catch (error) {
      throw new Error('Impossibile resettare la configurazione. Funzionalità non disponibile.');
    }
  }

  // Setup API
  async getSetupStatus(): Promise<APIResponse> {
    try {
      return await this.request('/api/setup/status');
    } catch (error) {
      throw new Error('Impossibile ottenere lo stato del setup. Funzionalità non disponibile.');
    }
  }

  async extractCompanyDataFromInvoice(file: File, invoiceType: string): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('invoice_type', invoiceType);

    try {
      return await this.post('/api/setup/extract-from-invoice', formData);
    } catch (error) {
      throw new Error('Impossibile estrarre dati aziendali dalla fattura. Funzionalità non disponibile.');
    }
  }

  async completeSetup(setupData: any): Promise<APIResponse> {
    try {
      return await this.post('/api/setup/complete', setupData);
    } catch (error) {
      throw new Error('Impossibile completare il setup. Funzionalità non disponibile.');
    }
  }

  async validateCompanyData(companyData: any): Promise<APIResponse> {
    try {
      return await this.post('/api/setup/validate-company-data', companyData);
    } catch (error) {
      throw new Error('Impossibile validare i dati aziendali. Funzionalità non disponibile.');
    }
  }

  async getImportSuggestions(): Promise<APIResponse> {
    try {
      return await this.request('/api/setup/import-suggestions');
    } catch (error) {
      throw new Error('Impossibile ottenere suggerimenti di importazione. Funzionalità non disponibile.');
    }
  }

  async testXMLExtraction(xmlContent: string, invoiceType: string): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('xml_content', xmlContent);
    formData.append('invoice_type', invoiceType);

    try {
      return await this.post('/api/setup/test-xml-extraction', formData);
    } catch (error) {
      throw new Error('Impossibile testare l\'estrazione XML. Funzionalità non disponibile.');
    }
  }

  // ===== ANAGRAPHICS API =====

  async getAnagraphics(filters: AnagraphicsFilters = {}) {
    try {
      const query = this.buildQuery(filters);
      return await this.request(`/api/anagraphics/?${query}`);
    } catch (error) {
      throw new Error('Impossibile recuperare le anagrafiche. Verificare la connessione al backend.');
    }
  }

  async getAnagraphicsById(id: number): Promise<Anagraphics> {
    try {
      return await this.request(`/api/anagraphics/${id}`);
    } catch (error) {
      throw new Error('Anagrafica non trovata o non accessibile.');
    }
  }

  async createAnagraphics(data: Partial<Anagraphics>): Promise<Anagraphics> {
    try {
      return await this.post('/api/anagraphics/', data);
    } catch (error) {
      throw new Error('Errore nella creazione dell\'anagrafica. Verificare i dati inseriti.');
    }
  }

  async updateAnagraphics(id: number, data: Partial<Anagraphics>): Promise<Anagraphics> {
    try {
      return await this.put(`/api/anagraphics/${id}`, data);
    } catch (error) {
      throw new Error('Errore nell\'aggiornamento dell\'anagrafica. Verificare i dati inseriti.');
    }
  }

  async deleteAnagraphics(id: number): Promise<APIResponse> {
    try {
      return await this.delete(`/api/anagraphics/${id}`);
    } catch (error) {
      throw new Error('Errore nella cancellazione dell\'anagrafica. Operazione non consentita.');
    }
  }

  async searchAnagraphics(query: string, type_filter?: string, limit: number = 10): Promise<APIResponse> {
    try {
      const params = this.buildQuery({ type_filter, limit });
      return await this.request(`/api/anagraphics/search/${encodeURIComponent(query)}?${params}`);
    } catch (error) {
      throw new Error('Errore nella ricerca anagrafiche. Funzionalità non disponibile.');
    }
  }

  async getAnagraphicsStats(): Promise<APIResponse> {
    try {
      return await this.request('/api/anagraphics/stats/summary');
    } catch (error) {
      throw new Error('Impossibile ottenere le statistiche anagrafiche. Funzionalità non disponibile.');
    }
  }

  async validatePIVA(piva: string): Promise<APIResponse> {
    try {
      return await this.request(`/api/anagraphics/validate/piva/${encodeURIComponent(piva)}`);
    } catch (error) {
      throw new Error('Servizio di validazione PIVA non disponibile.');
    }
  }

  async validateCodiceFiscale(cf: string): Promise<APIResponse> {
    try {
      return await this.request(`/api/anagraphics/validate/cf/${encodeURIComponent(cf)}`);
    } catch (error) {
      throw new Error('Servizio di validazione Codice Fiscale non disponibile.');
    }
  }

  async exportAnagraphicsQuick(format: 'csv' | 'json' | 'excel' = 'json', filters: AnagraphicsFilters = {}): Promise<any> {
    try {
      const params = this.buildQuery({ ...filters, format });
      return await this.request(`/api/export/anagraphics?${params}`);
    } catch (error) {
      throw new Error('Funzionalità di export anagrafiche non disponibile.');
    }
  }

  async bulkUpdateClientScores(): Promise<APIResponse> {
    try {
      return await this.post('/api/anagraphics/bulk/update-scores');
    } catch (error) {
      throw new Error('Funzionalità di aggiornamento score clienti non disponibile.');
    }
  }

  async checkPotentialDuplicates(): Promise<APIResponse> {
    try {
      return await this.request('/api/anagraphics/duplicates/check');
    } catch (error) {
      throw new Error('Controllo duplicati non disponibile.');
    }
  }

  async importAnagraphicsFromCSV(file: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      return await this.post('/api/anagraphics/import/csv', formData);
    } catch (error) {
      throw new Error('Funzionalità di import anagrafiche CSV non disponibile.');
    }
  }

  async batchCreateAnagraphics(anagraphicsList: Partial<Anagraphics>[]): Promise<APIResponse> {
    try {
      return await this.post('/api/anagraphics/batch/create', anagraphicsList);
    } catch (error) {
      throw new Error('Creazione batch anagrafiche non disponibile.');
    }
  }

  async mergeAnagraphics(sourceId: number, targetId: number): Promise<APIResponse> {
    try {
      return await this.post(`/api/anagraphics/merge/${sourceId}/${targetId}`);
    } catch (error) {
      throw new Error('Funzionalità di merge anagrafiche non disponibile.');
    }
  }

  async getProvincesList(): Promise<APIResponse> {
    try {
      return await this.request('/api/anagraphics/provinces/list');
    } catch (error) {
      throw new Error('Lista province non disponibile.');
    }
  }

  async getTopClientsAnalytics(limit: number = 20, periodMonths: number = 12): Promise<APIResponse> {
    try {
      const params = this.buildQuery({ limit, period_months: periodMonths });
      return await this.request(`/api/analytics/clients/top?${params}`);
    } catch (error) {
      throw new Error('Analytics clienti non disponibili.');
    }
  }

  // ===== INVOICES API =====

  async getInvoices(filters: InvoiceFilters = {}) {
    try {
      const query = this.buildQuery(filters);
      return await this.request(`/api/invoices/?${query}`);
    } catch (error) {
      throw new Error('Impossibile recuperare le fatture. Verificare la connessione al backend.');
    }
  }

  async getInvoiceById(id: number): Promise<Invoice> {
    try {
      return await this.request(`/api/invoices/${id}`);
    } catch (error) {
      throw new Error('Fattura non trovata o non accessibile.');
    }
  }

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    try {
      return await this.post('/api/invoices/', data);
    } catch (error) {
      throw new Error('Errore nella creazione della fattura. Verificare i dati inseriti.');
    }
  }

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice> {
    try {
      return await this.put(`/api/invoices/${id}`, data);
    } catch (error) {
      throw new Error('Errore nell\'aggiornamento della fattura. Verificare i dati inseriti.');
    }
  }

  async deleteInvoice(id: number): Promise<APIResponse> {
    try {
      return await this.delete(`/api/invoices/${id}`);
    } catch (error) {
      throw new Error('Errore nella cancellazione della fattura. Operazione non consentita.');
    }
  }

  async getInvoiceReconciliationLinks(invoiceId: number): Promise<APIResponse> {
    try {
      return await this.request(`/api/invoices/${invoiceId}/reconciliation-links`);
    } catch (error) {
      throw new Error('Collegamenti riconciliazione non disponibili.');
    }
  }

  async getOverdueInvoices(limit: number = 20): Promise<APIResponse> {
    try {
      return await this.request(`/api/invoices/overdue/list?limit=${limit}`);
    } catch (error) {
      throw new Error('Funzionalità fatture scadute non disponibile.');
    }
  }

  async getAgingSummary(invoice_type: 'Attiva' | 'Passiva' = 'Attiva'): Promise<APIResponse> {
    try {
      return await this.request(`/api/invoices/aging/summary?invoice_type=${invoice_type}`);
    } catch (error) {
      throw new Error('Aging summary non disponibile.');
    }
  }

  async searchInvoices(query: string, type_filter?: string, limit: number = 10): Promise<APIResponse> {
    try {
      const params = this.buildQuery({ type_filter, limit });
      return await this.request(`/api/invoices/search/${encodeURIComponent(query)}?${params}`);
    } catch (error) {
      throw new Error('Errore nella ricerca fatture. Funzionalità non disponibile.');
    }
  }

  async updateInvoicePaymentStatus(
    id: number,
    payment_status: string,
    paid_amount?: number
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({ payment_status, paid_amount });
      return await this.post(`/api/invoices/${id}/update-payment-status?${params}`);
    } catch (error) {
      throw new Error('Aggiornamento stato pagamento non disponibile.');
    }
  }

  async getInvoicesStats(): Promise<APIResponse> {
    try {
      return await this.request('/api/invoices/stats/summary');
    } catch (error) {
      throw new Error('Statistiche fatture non disponibili.');
    }
  }

  // ===== TRANSACTIONS API V4.0 =====

  async getTransactions(filters: TransactionFilters = {}) {
    try {
      const query = this.buildQuery(filters);
      return await this.request(`/api/transactions/?${query}`);
    } catch (error) {
      throw new Error('Impossibile recuperare le transazioni. Verificare la connessione al backend.');
    }
  }

  async getTransactionById(
    id: number,
    enhanced: boolean = false,
    include_suggestions: boolean = false,
    include_similar: boolean = false
  ): Promise<BankTransaction> {
    try {
      const params = this.buildQuery({ enhanced, include_suggestions, include_similar });
      return await this.request(`/api/transactions/${id}?${params}`);
    } catch (error) {
      throw new Error('Transazione non trovata o non accessibile.');
    }
  }

  async createTransaction(data: Partial<BankTransaction>): Promise<BankTransaction> {
    try {
      return await this.post('/api/transactions/', data);
    } catch (error) {
      throw new Error('Errore nella creazione della transazione. Verificare i dati inseriti.');
    }
  }

  async updateTransaction(id: number, data: Partial<BankTransaction>): Promise<BankTransaction> {
    try {
      return await this.put(`/api/transactions/${id}`, data);
    } catch (error) {
      throw new Error('Errore nell\'aggiornamento della transazione. Verificare i dati inseriti.');
    }
  }

  async deleteTransaction(id: number, confirm: boolean = true): Promise<APIResponse> {
    try {
      return await this.delete(`/api/transactions/${id}?confirm=${confirm}`);
    } catch (error) {
      throw new Error('Errore nella cancellazione della transazione. Operazione non consentita.');
    }
  }

  // Smart Suggestions V4.0
  async getSmartReconciliationSuggestions(
    transactionId: number,
    anagraphicsHint?: number,
    enableAI: boolean = true,
    enableSmartPatterns: boolean = true,
    enablePredictive: boolean = true,
    maxSuggestions: number = 10,
    confidenceThreshold: number = 0.6
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        anagraphics_hint: anagraphicsHint,
        enable_ai: enableAI,
        enable_smart_patterns: enableSmartPatterns,
        enable_predictive: enablePredictive,
        max_suggestions: maxSuggestions,
        confidence_threshold: confidenceThreshold
      });
      return await this.request(`/api/transactions/${transactionId}/smart-suggestions?${params}`);
    } catch (error) {
      throw new Error('Suggerimenti smart non disponibili. Funzionalità avanzata non supportata.');
    }
  }

  // Manual Reconciliation V4.0
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
    try {
      return await this.post(`/api/transactions/${transactionId}/reconcile-with/${invoiceId}`, {
        amount_to_match: amountToMatch,
        enable_ai_validation: enableAIValidation,
        enable_learning: enableLearning,
        user_confidence: userConfidence,
        user_notes: userNotes,
        force_match: forceMatch
      });
    } catch (error) {
      throw new Error('Riconciliazione manuale non disponibile.');
    }
  }

  // Batch Operations V4.0
  async batchReconcileTransactions(batchRequest: BatchReconciliationRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/transactions/batch/reconcile', batchRequest);
    } catch (error) {
      throw new Error('Riconciliazione batch non disponibile.');
    }
  }

  async batchUpdateTransactionStatus(
    transactionIds: number[],
    reconciliationStatus: string,
    enhanced: boolean = false,
    forceBackground: boolean = false,
    enableSmartValidation: boolean = true
  ): Promise<APIResponse> {
    try {
      return await this.post('/api/transactions/batch/update-status', {
        transaction_ids: transactionIds,
        reconciliation_status: reconciliationStatus,
        enhanced: enhanced,
        force_background: forceBackground,
        enable_smart_validation: enableSmartValidation
      });
    } catch (error) {
      throw new Error('Aggiornamento batch stato transazioni non disponibile.');
    }
  }

  // Analytics V4.0
  async getTransactionInsights(
    transactionId: number,
    includeAI: boolean = true,
    includePatterns: boolean = true,
    includeClientAnalysis: boolean = true,
    includeSmartSuggestions: boolean = false
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        include_ai_analysis: includeAI,
        include_pattern_matching: includePatterns,
        include_client_analysis: includeClientAnalysis,
        include_smart_suggestions: includeSmartSuggestions
      });
      return await this.request(`/api/transactions/${transactionId}/insights?${params}`);
    } catch (error) {
      throw new Error('Insights transazione non disponibili.');
    }
  }
  
  async getTransactionStatsV4(
    includePerformance: boolean = true,
    includeAIStats: boolean = true,
    includeDataQuality: boolean = true,
    periodMonths: number = 12
  ): Promise<APIResponse> {
    const params = this.buildQuery({ includePerformance, includeAIStats, includeDataQuality, periodMonths });
    try {
      return await this.request(`/api/transactions/stats/v4?${params}`);
    } catch (error) {
      throw new Error('Statistiche transazioni V4.0 non disponibili.');
    }
  }

  async getTransactionHealthV4(): Promise<APIResponse> {
    try {
      return await this.request('/api/transactions/health/v4');
    } catch (error) {
      throw new Error('Health check transazioni V4.0 non disponibile.');
    }
  }
  
  async getTransactionMetricsV4(): Promise<APIResponse> {
    try {
      return await this.request('/api/transactions/metrics/v4');
    } catch (error) {
      throw new Error('Metriche transazioni V4.0 non disponibili.');
    }
  }
  
  async getBatchOperationStatus(taskId: string): Promise<APIResponse> {
    try {
      return await this.request(`/api/transactions/batch/status/${taskId}`);
    } catch (error) {
      throw new Error('Stato operazione batch non disponibile.');
    }
  }

  async getCashFlowAnalysis(months: number = 12): Promise<APIResponse> {
    try {
      return await this.request(`/api/analytics/cash-flow/monthly?months=${months}`);
    } catch (error) {
      throw new Error('Analisi cash flow non disponibile.');
    }
  }

  // ===== RECONCILIATION API V4.0 =====
  
  // Ultra Smart Suggestions V4.0
  async getUltraSmartSuggestions(request: UltraReconciliationRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/reconciliation/ultra/smart-suggestions', request);
    } catch (error) {
      throw new Error('Suggerimenti Ultra-Smart V4.0 non disponibili.');
    }
  }
  
  // Manual Match V4.0
  async applyManualMatchV4(request: ManualMatchRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/reconciliation/manual-match', request);
    } catch (error) {
      throw new Error('Match manuale V4.0 non disponibile.');
    }
  }
  
  // Batch Reconciliation V4.0
  async processBatchReconciliationV4(request: BatchReconciliationRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/reconciliation/batch/process', request);
    } catch (error) {
      throw new Error('Batch reconciliation V4.0 non disponibile.');
    }
  }
  
  // Auto-Reconciliation V4.0
  async triggerAutoReconciliationV4(confidence_threshold: number, max_matches: number): Promise<APIResponse> {
    try {
      return await this.post('/api/reconciliation/auto/trigger', {
        confidence_threshold,
        max_matches
      });
    } catch (error) {
      throw new Error('Auto-reconciliation V4.0 non disponibile.');
    }
  }
  
  // Undo Reconciliation
  async undoReconciliation(link_id: number, learn_from_undo: boolean = true): Promise<APIResponse> {
    try {
      return await this.post(`/api/reconciliation/undo/${link_id}`, { learn_from_undo });
    } catch (error) {
      throw new Error('Annullamento riconciliazione non disponibile.');
    }
  }

  // Analytics & Stats
  async getReconciliationPerformanceMetrics(): Promise<APIResponse> {
    try {
      return await this.request('/api/reconciliation/performance/metrics');
    } catch (error) {
      throw new Error('Metriche performance riconciliazione non disponibili.');
    }
  }

  async getReconciliationSystemStatus(): Promise<any> {
    try {
      return await this.request('/api/reconciliation/system/status');
    } catch (error) {
      throw new Error('Stato sistema riconciliazione non disponibile.');
    }
  }
  
  async getReconciliationVersion(): Promise<APIResponse> {
    try {
      return await this.request('/api/reconciliation/version');
    } catch (error) {
      throw new Error('Versione sistema riconciliazione non disponibile.');
    }
  }
  
  async getReconciliationHealth(): Promise<APIResponse> {
    try {
      return await this.request('/api/reconciliation/health');
    } catch (error) {
      throw new Error('Health check riconciliazione non disponibile.');
    }
  }

  // AI & ML
  async triggerMLModelTraining(training_data_size: number, quantum_optimization: boolean, neural_enhancement: boolean): Promise<APIResponse> {
    try {
      return await this.post('/api/reconciliation/ml/train', {
        training_data_size,
        quantum_optimization,
        neural_enhancement
      });
    } catch (error) {
      throw new Error('Training modello ML non disponibile.');
    }
  }

  // Opportunities
  async getAutomaticMatchingOpportunitiesV4(
    confidenceLevel: 'High' | 'Medium' | 'Low',
    maxOpportunities: number,
    enableAI: boolean,
    enableSmartPatterns: boolean,
    enablePredictive: boolean
  ): Promise<APIResponse> {
    try {
      return await this.request('/api/reconciliation/opportunities/auto-match', {
        confidence_level: confidenceLevel,
        max_opportunities: maxOpportunities,
        enable_ai: enableAI,
        enable_smart_patterns: enableSmartPatterns,
        enable_predictive: enablePredictive
      });
    } catch (error) {
      throw new Error('Ricerca opportunità di matching non disponibile.');
    }
  }
  
  // Client Reliability
  async getClientPaymentReliability(anagraphicsId: number): Promise<APIResponse> {
    try {
      return await this.request(`/api/reconciliation/client-reliability/${anagraphicsId}`);
    } catch (error) {
      throw new Error('Analisi affidabilità cliente non disponibile.');
    }
  }
  
  // ANALYTICS & REPORTING API (V4.0 Endpoints)
  async getExecutiveDashboardUltra(
    include_predictions: boolean,
    include_ai_insights: boolean,
    real_time: boolean,
    cache_enabled: boolean
  ): Promise<APIResponse> {
    const params = this.buildQuery({ include_predictions, include_ai_insights, real_time, cache_enabled });
    try {
      return await this.get(`/api/analytics/dashboard/executive?${params}`);
    } catch (error) {
      throw new Error('Dashboard executive non disponibile.');
    }
  }

  async getOperationsDashboardLive(
    time_window_seconds: number,
    include_live_metrics: boolean,
    data_granularity: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({ time_window_seconds, include_live_metrics, data_granularity });
    try {
      return await this.get(`/api/analytics/dashboard/operations?${params}`);
    } catch (error) {
      throw new Error('Dashboard operativo non disponibile.');
    }
  }
  
  async getAIBusinessInsights(
    depth: string,
    time_period: string,
    include_recommendations: boolean,
    language: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({ depth, time_period, include_recommendations, language });
    try {
      return await this.get(`/api/analytics/ai/insights?${params}`);
    } catch (error) {
      throw new Error('AI business insights non disponibili.');
    }
  }

  async runCustomAIAnalysis(request: AnalyticsRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/analytics/ai/custom', request);
    } catch (error) {
      throw new Error('Analisi AI custom non disponibile.');
    }
  }

  async getRealtimeLiveMetrics(
    metric_type: string,
    last_seconds: number,
    aggregate: boolean
  ): Promise<APIResponse> {
    const params = this.buildQuery({ metric_type, last_seconds, aggregate });
    try {
      return await this.get(`/api/analytics/realtime/live?${params}`);
    } catch (error) {
      throw new Error('Metriche live non disponibili.');
    }
  }
  
  async getUltraPredictions(
    prediction_horizon: number,
    confidence_intervals: boolean,
    scenario_analysis: boolean,
    external_factors: boolean,
    model_ensemble: boolean
  ): Promise<APIResponse> {
    const params = this.buildQuery({ prediction_horizon, confidence_intervals, scenario_analysis, external_factors, model_ensemble });
    try {
      return await this.get(`/api/analytics/predictions/ultra?${params}`);
    } catch (error) {
      throw new Error('Previsioni Ultra non disponibili.');
    }
  }
  
  async getUltraSystemHealth(): Promise<APIResponse> {
    try {
      return await this.request('/api/analytics/system/health/ultra');
    } catch (error) {
      throw new Error('Health check sistema Ultra non disponibile.');
    }
  }
  
  async exportUltraAnalyticsReport(
    report_type: string,
    format: string,
    include_ai_insights: boolean,
    include_predictions: boolean,
    include_recommendations: boolean,
    custom_sections?: string,
    language?: string
  ): Promise<Blob | any> {
    const params = this.buildQuery({
      report_type,
      format,
      include_ai_insights,
      include_predictions,
      include_recommendations,
      custom_sections,
      language
    });
    try {
      return await this.get(`/api/analytics/export/ultra?${params}`);
    } catch (error) {
      throw new Error('Export report Ultra non disponibile.');
    }
  }

  async getCompetitiveMarketPosition(
    benchmark_against: string,
    include_price_analysis: boolean,
    include_margin_optimization: boolean,
    market_scope: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({ benchmark_against, include_price_analysis, include_margin_optimization, market_scope });
    try {
      return await this.get(`/api/analytics/competitive/market-position?${params}`);
    } catch (error) {
      throw new Error('Analisi competitiva non disponibile.');
    }
  }
  
  async getUltraCustomerIntelligence(
    analysis_depth: string,
    include_predictive_ltv: boolean,
    include_churn_prediction: boolean,
    include_next_best_action: boolean,
    segment_granularity: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({ analysis_depth, include_predictive_ltv, include_churn_prediction, include_next_best_action, segment_granularity });
    try {
      return await this.get(`/api/analytics/customers/ultra-intelligence?${params}`);
    } catch (error) {
      throw new Error('Customer intelligence Ultra non disponibile.');
    }
  }

  async getUltraSeasonalityAnalysis(
    years_back: number,
    include_weather_correlation: boolean,
    predict_months_ahead: number,
    confidence_level: number,
    category_focus?: string
  ): Promise<APIResponse> {
    const params = this.buildQuery({ years_back, include_weather_correlation, predict_months_ahead, confidence_level, category_focus });
    try {
      return await this.get(`/api/analytics/seasonality/ultra?${params}`);
    } catch (error) {
      throw new Error('Analisi stagionalità Ultra non disponibile.');
    }
  }
  
  async processBatchUltraAnalytics(request: BatchAnalyticsRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/analytics/batch/ultra', request);
    } catch (error) {
      throw new Error('Batch analytics Ultra non disponibile.');
    }
  }

  // Import/Export
  async validateInvoiceFiles(files: File[]): Promise<APIResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    try {
        return await this.post('/api/import/validate-invoices', formData);
    } catch(error) {
        throw new Error('Validazione fatture non disponibile.');
    }
  }

  async downloadTemplate(templateType: 'transactions' | 'anagraphics'): Promise<Blob> {
      try {
          const response = await fetch(`${this.baseURL}/api/import-export/templates/${templateType}-csv`);
          if (!response.ok) throw new Error('Template not found');
          return await response.blob();
      } catch (error) {
          throw new Error('Download template non disponibile.');
      }
  }
}

export const apiClient = new ApiClient();

// Helper per testare la connessione al backend (usato in ConnectionTest.tsx)
export const testBackendConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      return { connected: false, message: `Status: ${response.status}`, details: await response.text() };
    }
    const data = await response.json();
    return { connected: true, message: `Connesso alla versione ${data.version}`, details: data };
  } catch (error) {
    return { connected: false, message: 'Connessione fallita.', details: error.toString() };
  }
};
