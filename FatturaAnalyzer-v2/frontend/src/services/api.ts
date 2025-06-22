/**
 * ENTERPRISE API Client V4.0 for FatturaAnalyzer Backend - PRODUCTION VERSION
 * Versione definitiva per ambiente enterprise senza dati simulati
 * 
 * Features:
 * - Metodi HTTP completi (GET, POST, PUT, DELETE, PATCH)
 * - Sistema di fallback enterprise-grade senza mock data
 * - Gestione errori professionale con messaggi chiari
 * - Compatibilità con diverse versioni del backend
 * - Fallimenti gestiti con messaggi informativi appropriati
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
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request('/health');
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
      return await this.request('/api/first-run/system/info');
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
      return await this.request(`/api/anagraphics/${query ? '?' + query : ''}`);
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
      return await this.request(`/api/anagraphics/search/${encodeURIComponent(query)}${params ? '?' + params : ''}`);
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

  async exportAnagraphicsQuick(format: 'csv' | 'json' = 'json', type_filter?: string): Promise<APIResponse> {
    try {
      const params = this.buildQuery({ format, type_filter });
      return await this.request(`/api/anagraphics/export/${format}${params ? '?' + params : ''}`);
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
      return await this.request(`/api/anagraphics/analytics/top-clients?${params}`);
    } catch (error) {
      throw new Error('Analytics clienti non disponibili.');
    }
  }

  async getAnagraphicsHealthCheck(): Promise<APIResponse> {
    try {
      return await this.request('/api/anagraphics/health-check');
    } catch (error) {
      throw new Error('Health check anagrafiche non disponibile.');
    }
  }

  // ===== INVOICES API =====
  
  async getInvoices(filters: InvoiceFilters = {}) {
    try {
      const query = this.buildQuery(filters);
      return await this.request(`/api/invoices/${query ? '?' + query : ''}`);
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
      return await this.request(`/api/invoices/search/${encodeURIComponent(query)}${params ? '?' + params : ''}`);
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
      return await this.request(`/api/transactions/${query ? '?' + query : ''}`);
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
      return await this.request(`/api/transactions/${id}${params ? '?' + params : ''}`);
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
        reconciliation_status: reconciliationStatus
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Enhanced': enhanced.toString(),
          'X-Force-Background': forceBackground.toString(),
          'X-Smart-Validation': enableSmartValidation.toString()
        }
      });
    } catch (error) {
      throw new Error('Aggiornamento batch stato non disponibile.');
    }
  }

  // Transaction Insights V4.0
  async getTransactionInsights(
    transactionId: number,
    includeAIAnalysis: boolean = true,
    includePatternMatching: boolean = true,
    includeClientAnalysis: boolean = true,
    includeSmartSuggestions: boolean = false
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        include_ai_analysis: includeAIAnalysis,
        include_pattern_matching: includePatternMatching,
        include_client_analysis: includeClientAnalysis,
        include_smart_suggestions: includeSmartSuggestions
      });
      return await this.request(`/api/transactions/${transactionId}/insights?${params}`);
    } catch (error) {
      throw new Error('Insights transazione non disponibili.');
    }
  }

  // Batch Task Status V4.0
  async getBatchTaskStatus(taskId: string): Promise<APIResponse> {
    try {
      return await this.request(`/api/transactions/batch/status/${taskId}`);
    } catch (error) {
      throw new Error('Stato task batch non disponibile.');
    }
  }

  // Search Enhanced V4.0
  async searchTransactions(
    query: string, 
    limit: number = 10,
    includeReconciled: boolean = false,
    searchMode: 'smart' | 'exact' | 'fuzzy' | 'ai_enhanced' = 'smart',
    enhancedResults: boolean = false,
    enableClientMatching: boolean = false
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        limit,
        include_reconciled: includeReconciled,
        search_mode: searchMode,
        enhanced_results: enhancedResults,
        enable_client_matching: enableClientMatching
      });
      return await this.request(`/api/transactions/search/${encodeURIComponent(query)}?${params}`);
    } catch (error) {
      throw new Error('Ricerca transazioni non disponibile.');
    }
  }

  // Statistics Ultra V4.0
  async getTransactionStatsV4(
    useCache: boolean = true,
    includeTrends: boolean = false,
    includeAIInsights: boolean = false,
    periodMonths: number = 12
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        use_cache: useCache,
        include_trends: includeTrends,
        include_ai_insights: includeAIInsights,
        period_months: periodMonths
      });
      return await this.request(`/api/transactions/stats/summary?${params}`);
    } catch (error) {
      throw new Error('Statistiche transazioni non disponibili.');
    }
  }

  // Original methods maintained for compatibility
  async getTransactionStats(): Promise<APIResponse> {
    return this.getTransactionStatsV4();
  }

  async getCashFlowAnalysis(months: number = 12): Promise<APIResponse> {
    try {
      return await this.request(`/api/transactions/analysis/cash-flow?months=${months}`);
    } catch (error) {
      throw new Error('Analisi cash flow non disponibile.');
    }
  }

  // Health & Metrics V4.0
  async getTransactionHealthV4(): Promise<APIResponse> {
    try {
      return await this.request('/api/transactions/health');
    } catch (error) {
      throw new Error('Health check transazioni non disponibile.');
    }
  }

  async getTransactionMetricsV4(): Promise<APIResponse> {
    try {
      return await this.request('/api/transactions/metrics');
    } catch (error) {
      throw new Error('Metriche transazioni non disponibili.');
    }
  }

  // ===== RECONCILIATION API V4.0 ULTRA =====

  // Ultra Smart Suggestions V4.0
  async getUltraSmartSuggestions(request: UltraReconciliationRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/reconciliation/ultra/smart-suggestions', request);
    } catch (error) {
      throw new Error('Suggerimenti ultra smart non disponibili.');
    }
  }

  // Manual Match V4.0 with AI
  async applyManualMatchV4(request: ManualMatchRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/reconciliation/manual-match', request);
    } catch (error) {
      throw new Error('Match manuale V4.0 non disponibile.');
    }
  }

  // Batch Processing V4.0
  async processBatchReconciliationV4(request: BatchReconciliationRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/reconciliation/batch/ultra-processing', request);
    } catch (error) {
      throw new Error('Elaborazione batch V4.0 non disponibile.');
    }
  }

  // System Status V4.0
  async getReconciliationSystemStatus(): Promise<APIResponse> {
    try {
      return await this.request('/api/reconciliation/system/status');
    } catch (error) {
      throw new Error('Stato sistema riconciliazione non disponibile.');
    }
  }

  async getReconciliationVersionInfo(): Promise<APIResponse> {
    try {
      return await this.request('/api/reconciliation/system/version');
    } catch (error) {
      throw new Error('Informazioni versione riconciliazione non disponibili.');
    }
  }

  async getReconciliationPerformanceMetrics(): Promise<APIResponse> {
    try {
      return await this.request('/api/reconciliation/system/performance');
    } catch (error) {
      throw new Error('Metriche performance riconciliazione non disponibili.');
    }
  }

  // Client Reliability V4.0
  async getClientPaymentReliabilityV4(
    anagraphicsId: number,
    includePredictions: boolean = true,
    includePatternAnalysis: boolean = true,
    enhancedInsights: boolean = true
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        include_predictions: includePredictions,
        include_pattern_analysis: includePatternAnalysis,
        enhanced_insights: enhancedInsights
      });
      return await this.request(`/api/reconciliation/client/reliability/${anagraphicsId}?${params}`);
    } catch (error) {
      throw new Error('Affidabilità cliente non disponibile.');
    }
  }

  // Automatic Matching V4.0
  async getAutomaticMatchingOpportunitiesV4(
    confidenceLevel: 'Exact' | 'High' | 'Medium' | 'Low' = 'High',
    maxOpportunities: number = 50,
    enableAIFiltering: boolean = true,
    enableRiskAssessment: boolean = true,
    prioritizeHighValue: boolean = true
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        confidence_level: confidenceLevel,
        max_opportunities: maxOpportunities,
        enable_ai_filtering: enableAIFiltering,
        enable_risk_assessment: enableRiskAssessment,
        prioritize_high_value: prioritizeHighValue
      });
      return await this.request(`/api/reconciliation/automatic/opportunities?${params}`);
    } catch (error) {
      throw new Error('Opportunità matching automatico non disponibili.');
    }
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
    try {
      return await this.request('/api/reconciliation/health-check');
    } catch (error) {
      throw new Error('Health check riconciliazione non disponibile.');
    }
  }

  // ===== ANALYTICS API V3.0 ULTRA =====

  // Executive Dashboard Ultra
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
    
    try {
      // Prova prima l'endpoint V4.0
      return await this.request(`/api/analytics/dashboard/executive?${params}`);
    } catch (error) {
      try {
        // Fallback all'endpoint standard
        return await this.request(`/analytics/dashboard?${params}`);
      } catch (fallbackError) {
        try {
          // Ultimo fallback a KPI semplici
          return await this.request('/analytics/kpis');
        } catch (finalError) {
          throw new Error('Dashboard esecutiva non disponibile. Tutte le API analytics non raggiungibili.');
        }
      }
    }
  }

  // Operations Dashboard Live
  async getOperationsDashboardLive(
    autoRefreshSeconds: number = 30,
    includeAlerts: boolean = true,
    alertPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        auto_refresh_seconds: autoRefreshSeconds,
        include_alerts: includeAlerts,
        alert_priority: alertPriority
      });
      return await this.request(`/api/analytics/dashboard/operations/live?${params}`);
    } catch (error) {
      throw new Error('Dashboard operativo non disponibile.');
    }
  }

  // AI Business Insights
  async getAIBusinessInsights(
    analysisDepth: 'quick' | 'standard' | 'deep' = 'standard',
    focusAreas?: string,
    includeRecommendations: boolean = true,
    language: 'it' | 'en' = 'it'
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        analysis_depth: analysisDepth,
        focus_areas: focusAreas,
        include_recommendations: includeRecommendations,
        language
      });
      return await this.request(`/api/analytics/ai/business-insights?${params}`);
    } catch (error) {
      throw new Error('AI Business Insights non disponibile.');
    }
  }

  // Custom AI Analysis
  async runCustomAIAnalysis(request: AnalyticsRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/analytics/ai/custom-analysis', request);
    } catch (error) {
      throw new Error('Analisi AI personalizzata non disponibile.');
    }
  }

  async getUltraSeasonalityAnalysis(
    yearsBack: number = 3,
    includeWeatherCorrelation: boolean = false,
    predictMonthsAhead: number = 6,
    confidenceLevel: number = 0.95,
    categoryFocus?: string
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        years_back: yearsBack,
        include_weather_correlation: includeWeatherCorrelation,
        predict_months_ahead: predictMonthsAhead,
        confidence_level: confidenceLevel,
        category_focus: categoryFocus
      });
      return await this.request(`/api/analytics/seasonality/ultra-analysis?${params}`);
    } catch (error) {
      throw new Error('Analisi stagionalità non disponibile.');
    }
  }

  async getUltraCustomerIntelligence(
    analysisDepth: 'basic' | 'standard' | 'comprehensive' | 'expert' = 'comprehensive',
    includePredictiveLTV: boolean = true,
    includeChurnPrediction: boolean = true,
    includeNextBestAction: boolean = true,
    segmentGranularity: 'basic' | 'detailed' | 'micro' = 'detailed'
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        analysis_depth: analysisDepth,
        include_predictive_ltv: includePredictiveLTV,
        include_churn_prediction: includeChurnPrediction,
        include_next_best_action: includeNextBestAction,
        segment_granularity: segmentGranularity
      });
      return await this.request(`/api/analytics/customers/ultra-intelligence?${params}`);
    } catch (error) {
      throw new Error('Customer intelligence non disponibile.');
    }
  }

  async getCompetitiveMarketPosition(
    benchmarkAgainst: 'industry' | 'local' | 'premium' = 'industry',
    includePriceAnalysis: boolean = true,
    includeMarginOptimization: boolean = true,
    marketScope: 'local' | 'regional' | 'national' = 'regional'
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        benchmark_against: benchmarkAgainst,
        include_price_analysis: includePriceAnalysis,
        include_margin_optimization: includeMarginOptimization,
        market_scope: marketScope
      });
      return await this.request(`/api/analytics/competitive/market-position?${params}`);
    } catch (error) {
      throw new Error('Posizione competitiva non disponibile.');
    }
  }

  async processBatchUltraAnalytics(request: BatchAnalyticsRequest): Promise<APIResponse> {
    try {
      return await this.post('/api/analytics/batch/ultra-analytics', request);
    } catch (error) {
      throw new Error('Analytics batch non disponibile.');
    }
  }

  async exportUltraAnalyticsReport(
    reportType: 'executive' | 'operational' | 'comprehensive' | 'custom' = 'comprehensive',
    format: 'excel' | 'pdf' | 'json' | 'csv' = 'excel',
    includeAIInsights: boolean = true,
    includePredictions: boolean = true,
    includeRecommendations: boolean = true,
    customSections?: string,
    language: 'it' | 'en' = 'it'
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        report_type: reportType,
        format,
        include_ai_insights: includeAIInsights,
        include_predictions: includePredictions,
        include_recommendations: includeRecommendations,
        custom_sections: customSections,
        language
      });
      return await this.request(`/api/analytics/export/ultra-report?${params}`);
    } catch (error) {
      throw new Error('Export report analytics non disponibile.');
    }
  }

  async getRealtimeLiveMetrics(
    metrics: string = 'all',
    refreshRate: number = 10,
    includeAlerts: boolean = true
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        metrics,
        refresh_rate: refreshRate,
        include_alerts: includeAlerts
      });
      return await this.request(`/api/analytics/realtime/live-metrics?${params}`);
    } catch (error) {
      throw new Error('Metriche real-time non disponibili.');
    }
  }

  async getUltraPredictions(
    predictionHorizon: number = 12,
    confidenceIntervals: boolean = true,
    scenarioAnalysis: boolean = true,
    externalFactors: boolean = false,
    modelEnsemble: boolean = true
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({
        prediction_horizon: predictionHorizon,
        confidence_intervals: confidenceIntervals,
        scenario_analysis: scenarioAnalysis,
        external_factors: externalFactors,
        model_ensemble: modelEnsemble
      });
      return await this.request(`/api/analytics/forecasting/ultra-predictions?${params}`);
    } catch (error) {
      throw new Error('Previsioni ultra non disponibili.');
    }
  }

  async getUltraSystemHealth(): Promise<APIResponse> {
    try {
      return await this.request('/api/analytics/system/ultra-health');
    } catch (error) {
      throw new Error('System health analytics non disponibile.');
    }
  }

  async getUltraAnalyticsFeatures(): Promise<APIResponse> {
    try {
      return await this.request('/api/analytics/system/ultra-features');
    } catch (error) {
      throw new Error('Features analytics non disponibili.');
    }
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

  // ===== IMPORT/EXPORT API =====

  // XML/P7M Import
  async importInvoicesXML(files: FileList): Promise<APIResponse> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      // Prova endpoint V4.0 ZIP
      return await this.post('/api/import-export/invoices/zip', formData);
    } catch (error) {
      try {
        // Fallback a endpoint XML standard
        return await this.post('/api/import-export/invoices/xml', formData);
      } catch (fallbackError) {
        try {
          // Fallback a endpoint base
          return await this.post('/import/invoices', formData);
        } catch (finalError) {
          throw new Error('Import fatture XML non disponibile. Tutti gli endpoint di import sono non raggiungibili.');
        }
      }
    }
  }

  async validateInvoiceFiles(files: FileList): Promise<APIResponse> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      return await this.post('/api/import-export/invoices/xml/validate', formData);
    } catch (error) {
      try {
        return await this.post('/import/validate', formData);
      } catch (fallbackError) {
        throw new Error('Validazione file fatture non disponibile.');
      }
    }
  }

  // CSV Import
  async importTransactionsCSV(file: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      return await this.post('/api/import-export/transactions/csv', formData);
    } catch (error) {
      try {
        return await this.post('/import/transactions', formData);
      } catch (fallbackError) {
        throw new Error('Import transazioni CSV non disponibile.');
      }
    }
  }

  async validateTransactionsCSV(file: File): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      return await this.post('/api/import-export/transactions/csv/validate', formData);
    } catch (error) {
      throw new Error('Validazione CSV transazioni non disponibile.');
    }
  }

  async previewTransactionsCSV(file: File, maxRows: number = 10): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      return await this.post(`/api/import-export/transactions/csv/preview?max_rows=${maxRows}`, formData);
    } catch (error) {
      throw new Error('Preview CSV transazioni non disponibile.');
    }
  }

  // Export functionality
  async exportData(
    dataType: 'invoices' | 'transactions' | 'anagraphics',
    format: 'csv' | 'excel' | 'json' = 'excel',
    filters?: Record<string, any>
  ): Promise<APIResponse> {
    try {
      const params = this.buildQuery({ format, ...filters });
      return await this.request(`/api/import-export/${dataType}/export?${params}`);
    } catch (error) {
      throw new Error(`Export ${dataType} non disponibile.`);
    }
  }

  // Bulk operations
  async bulkImportData(
    dataType: 'invoices' | 'transactions' | 'anagraphics',
    file: File,
    options?: Record<string, any>
  ): Promise<APIResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    try {
      return await this.post(`/api/import-export/${dataType}/bulk-import`, formData);
    } catch (error) {
      throw new Error(`Import bulk ${dataType} non disponibile.`);
    }
  }

  // Import status and progress
  async getImportStatus(importId: string): Promise<APIResponse> {
    try {
      return await this.request(`/api/import-export/status/${importId}`);
    } catch (error) {
      throw new Error('Stato import non disponibile.');
    }
  }

  async getImportHistory(limit: number = 20): Promise<APIResponse> {
    try {
      return await this.request(`/api/import-export/history?limit=${limit}`);
    } catch (error) {
      throw new Error('Storico import non disponibile.');
    }
  }

  // Template and format helpers
  async getImportTemplate(dataType: 'invoices' | 'transactions' | 'anagraphics'): Promise<APIResponse> {
    try {
      return await this.request(`/api/import-export/${dataType}/template`);
    } catch (error) {
      throw new Error(`Template import ${dataType} non disponibile.`);
    }
  }

  async getSupportedFormats(): Promise<APIResponse> {
    try {
      return await this.request('/api/import-export/supported-formats');
    } catch (error) {
      throw new Error('Formati supportati non disponibili.');
    }
  }

  // ===== SYSTEM & UTILITY METHODS =====

  // System information
  async getSystemVersion(): Promise<APIResponse> {
    try {
      return await this.request('/api/system/version');
    } catch (error) {
      throw new Error('Informazioni versione sistema non disponibili.');
    }
  }

  async getSystemCapabilities(): Promise<APIResponse> {
    try {
      return await this.request('/api/system/capabilities');
    } catch (error) {
      throw new Error('Capacità sistema non disponibili.');
    }
  }

  // Configuration
  async getConfiguration(): Promise<APIResponse> {
    try {
      return await this.request('/api/system/configuration');
    } catch (error) {
      throw new Error('Configurazione sistema non disponibile.');
    }
  }

  async updateConfiguration(config: Record<string, any>): Promise<APIResponse> {
    try {
      return await this.post('/api/system/configuration', config);
    } catch (error) {
      throw new Error('Aggiornamento configurazione non disponibile.');
    }
  }

  // Backup and maintenance
  async createBackup(): Promise<APIResponse> {
    try {
      return await this.post('/api/system/backup/create');
    } catch (error) {
      throw new Error('Creazione backup non disponibile.');
    }
  }

  async getBackupStatus(): Promise<APIResponse> {
    try {
      return await this.request('/api/system/backup/status');
    } catch (error) {
      throw new Error('Stato backup non disponibile.');
    }
  }

  async runMaintenanceTasks(): Promise<APIResponse> {
    try {
      return await this.post('/api/system/maintenance/run');
    } catch (error) {
      throw new Error('Operazioni di manutenzione non disponibili.');
    }
  }

  // Logging and monitoring
  async getSystemLogs(
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    limit: number = 100
  ): Promise<APIResponse> {
    try {
      return await this.request(`/api/system/logs?level=${level}&limit=${limit}`);
    } catch (error) {
      throw new Error('Log di sistema non disponibili.');
    }
  }

  async getPerformanceMetrics(): Promise<APIResponse> {
    try {
      return await this.request('/api/system/performance');
    } catch (error) {
      throw new Error('Metriche di performance non disponibili.');
    }
  }

  // User and session management
  async getCurrentUser(): Promise<APIResponse> {
    try {
      return await this.request('/api/user/current');
    } catch (error) {
      throw new Error('Informazioni utente corrente non disponibili.');
    }
  }

  async updateUserPreferences(preferences: Record<string, any>): Promise<APIResponse> {
    try {
      return await this.post('/api/user/preferences', preferences);
    } catch (error) {
      throw new Error('Aggiornamento preferenze utente non disponibile.');
    }
  }

  async getUserSessions(): Promise<APIResponse> {
    try {
      return await this.request('/api/user/sessions');
    } catch (error) {
      throw new Error('Sessioni utente non disponibili.');
    }
  }

  // Notification and alerts
  async getNotifications(unreadOnly: boolean = false): Promise<APIResponse> {
    try {
      return await this.request(`/api/notifications?unread_only=${unreadOnly}`);
    } catch (error) {
      throw new Error('Notifiche non disponibili.');
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<APIResponse> {
    try {
      return await this.post(`/api/notifications/${notificationId}/mark-read`);
    } catch (error) {
      throw new Error('Aggiornamento notifica non disponibile.');
    }
  }

  async getSystemAlerts(): Promise<APIResponse> {
    try {
      return await this.request('/api/system/alerts');
    } catch (error) {
      throw new Error('Alert di sistema non disponibili.');
    }
  }

  // Webhook and integration endpoints
  async getWebhooks(): Promise<APIResponse> {
    try {
      return await this.request('/api/webhooks');
    } catch (error) {
      throw new Error('Webhook non disponibili.');
    }
  }

  async createWebhook(webhookData: Record<string, any>): Promise<APIResponse> {
    try {
      return await this.post('/api/webhooks', webhookData);
    } catch (error) {
      throw new Error('Creazione webhook non disponibile.');
    }
  }

  async testWebhook(webhookId: string): Promise<APIResponse> {
    try {
      return await this.post(`/api/webhooks/${webhookId}/test`);
    } catch (error) {
      throw new Error('Test webhook non disponibile.');
    }
  }

  // Integration status
  async getIntegrationStatus(): Promise<APIResponse> {
    try {
      return await this.request('/api/integrations/status');
    } catch (error) {
      throw new Error('Stato integrazioni non disponibile.');
    }
  }

  async refreshIntegrations(): Promise<APIResponse> {
    try {
      return await this.post('/api/integrations/refresh');
    } catch (error) {
      throw new Error('Refresh integrazioni non disponibile.');
    }
  }
}

// ===== SINGLETON INSTANCE =====
const apiClient = new ApiClient();

export default apiClient;
export { ApiClient };
