/**
 * Zustand Store Configuration V4.0 Ultra-Enhanced
 * Aggiornato per supportare tutte le nuove funzionalità del backend:
 * - Analytics V3.0 Ultra-Optimized con AI/ML
 * - Reconciliation V4.0 Smart Features
 * - Transactions V4.0 Enhanced
 * - First Run Wizard completo
 * - Import/Export avanzato
 * - Cloud Sync
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

import type { 
  Theme, 
  AppSettings, 
  Notification, 
  LoadingState, 
  ErrorState,
  DashboardData,
  Invoice,
  BankTransaction,
  Anagraphics
} from '@/types';

// ===== NEW V4.0 INTERFACES =====

export interface AIInsights {
  business_insights?: any;
  predictions?: any;
  recommendations?: string[];
  confidence_score?: number;
  last_updated?: string;
}

export interface SmartReconciliationState {
  ai_enhanced_suggestions?: any[];
  pattern_analysis?: any;
  client_reliability_data?: Record<number, any>;
  ultra_suggestions_cache?: Record<string, any>;
  performance_metrics?: any;
  learning_enabled?: boolean;
}

export interface AnalyticsV3State {
  executive_dashboard?: any;
  operations_dashboard?: any;
  real_time_metrics?: any;
  ai_insights?: AIInsights;
  cached_reports?: Record<string, any>;
  ultra_features_enabled?: boolean;
}

export interface SystemStatus {
  backend_version?: string;
  api_version?: string;
  features_enabled?: string[];
  adapter_status?: Record<string, any>;
  performance_metrics?: any;
  last_health_check?: string;
}

export interface FirstRunState {
  is_first_run?: boolean;
  wizard_step?: number;
  setup_completed?: boolean;
  company_configured?: boolean;
  database_initialized?: boolean;
  wizard_state?: any;
}

// ===== UI STORE V4.0 =====
interface UIStateV4 {
  // Theme e impostazioni
  theme: Theme;
  sidebarCollapsed: boolean;
  
  // Loading states V4.0
  loading: LoadingState;
  
  // Error states V4.0
  errors: ErrorState;
  
  // Notifications V4.0
  notifications: Notification[];
  
  // Modal states V4.0
  modals: {
    [key: string]: boolean;
  };
  
  // Settings V4.0
  settings: AppSettings & {
    ai_features_enabled?: boolean;
    smart_reconciliation_enabled?: boolean;
    real_time_updates?: boolean;
    cache_preferences?: {
      analytics_cache_ttl?: number;
      enable_smart_caching?: boolean;
    };
    ui_preferences?: {
      show_ai_insights?: boolean;
      show_confidence_scores?: boolean;
      auto_refresh_dashboards?: boolean;
    };
  };
  
  // System Status V4.0
  systemStatus: SystemStatus;
  
  // First Run State V4.0
  firstRunState: FirstRunState;
  
  // Actions V4.0
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearErrors: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
  updateSettings: (settings: Partial<UIStateV4['settings']>) => void;
  updateSystemStatus: (status: Partial<SystemStatus>) => void;
  updateFirstRunState: (state: Partial<FirstRunState>) => void;
  
  // V4.0 New Actions
  enableAIFeatures: () => void;
  disableAIFeatures: () => void;
  toggleSmartReconciliation: () => void;
  setRealTimeUpdates: (enabled: boolean) => void;
}

export const useUIStore = create<UIStateV4>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state V4.0
          theme: 'system',
          sidebarCollapsed: false,
          loading: {},
          errors: {},
          notifications: [],
          modals: {},
          settings: {
            theme: 'system',
            language: 'it',
            currency: 'EUR',
            date_format: 'dd/MM/yyyy',
            number_format: 'it-IT',
            pagination_size: 50,
            auto_sync: false,
            notifications: {
              email: true,
              desktop: true,
              sounds: false,
            },
            // V4.0 New Settings
            ai_features_enabled: true,
            smart_reconciliation_enabled: true,
            real_time_updates: false,
            cache_preferences: {
              analytics_cache_ttl: 300, // 5 minutes
              enable_smart_caching: true,
            },
            ui_preferences: {
              show_ai_insights: true,
              show_confidence_scores: true,
              auto_refresh_dashboards: false,
            },
          },
          systemStatus: {
            backend_version: 'unknown',
            api_version: 'V4.0',
            features_enabled: [],
            adapter_status: {},
            performance_metrics: {},
            last_health_check: null,
          },
          firstRunState: {
            is_first_run: false,
            wizard_step: 1,
            setup_completed: false,
            company_configured: false,
            database_initialized: false,
            wizard_state: null,
          },
          
          // Actions V4.0
          setTheme: (theme) => set((state) => {
            state.theme = theme;
            state.settings.theme = theme;
          }),
          
          toggleSidebar: () => set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          }),
          
          setSidebarCollapsed: (collapsed) => set((state) => {
            state.sidebarCollapsed = collapsed;
          }),
          
          setLoading: (key, loading) => set((state) => {
            if (loading) {
              state.loading[key] = true;
            } else {
              delete state.loading[key];
            }
          }),
          
          setError: (key, error) => set((state) => {
            if (error) {
              state.errors[key] = error;
            } else {
              delete state.errors[key];
            }
          }),
          
          clearErrors: () => set((state) => {
            state.errors = {};
          }),
          
          addNotification: (notification) => set((state) => {
            const id = Date.now().toString() + Math.random().toString(36);
            state.notifications.push({
              ...notification,
              id,
            });
          }),
          
          removeNotification: (id) => set((state) => {
            state.notifications = state.notifications.filter(n => n.id !== id);
          }),
          
          clearNotifications: () => set((state) => {
            state.notifications = [];
          }),
          
          openModal: (key) => set((state) => {
            state.modals[key] = true;
          }),
          
          closeModal: (key) => set((state) => {
            state.modals[key] = false;
          }),
          
          updateSettings: (newSettings) => set((state) => {
            state.settings = { ...state.settings, ...newSettings };
          }),
          
          updateSystemStatus: (status) => set((state) => {
            state.systemStatus = { ...state.systemStatus, ...status };
          }),
          
          updateFirstRunState: (newState) => set((state) => {
            state.firstRunState = { ...state.firstRunState, ...newState };
          }),
          
          // V4.0 New Actions
          enableAIFeatures: () => set((state) => {
            state.settings.ai_features_enabled = true;
            state.settings.ui_preferences!.show_ai_insights = true;
            state.settings.ui_preferences!.show_confidence_scores = true;
          }),
          
          disableAIFeatures: () => set((state) => {
            state.settings.ai_features_enabled = false;
            state.settings.ui_preferences!.show_ai_insights = false;
            state.settings.ui_preferences!.show_confidence_scores = false;
          }),
          
          toggleSmartReconciliation: () => set((state) => {
            state.settings.smart_reconciliation_enabled = !state.settings.smart_reconciliation_enabled;
          }),
          
          setRealTimeUpdates: (enabled) => set((state) => {
            state.settings.real_time_updates = enabled;
            state.settings.ui_preferences!.auto_refresh_dashboards = enabled;
          }),
        }))
      ),
      {
        name: 'fattura-analyzer-ui-v4',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          settings: state.settings,
          systemStatus: {
            backend_version: state.systemStatus.backend_version,
            api_version: state.systemStatus.api_version,
          },
        }),
      }
    ),
    { name: 'UIStoreV4' }
  )
);

// ===== DATA STORE V4.0 =====
interface DataStateV4 {
  // Dashboard data V4.0
  dashboardData: DashboardData | null;
  dashboardLastUpdated: string | null;
  
  // Analytics V3.0 State
  analyticsV3: AnalyticsV3State;
  
  // Cached data V4.0
  invoices: {
    data: Invoice[];
    total: number;
    lastFetch: string | null;
    enhanced_data?: any; // AI insights, etc.
  };
  
  transactions: {
    data: BankTransaction[];
    total: number;
    lastFetch: string | null;
    enhanced_data?: any; // AI insights, patterns, etc.
    v4_features?: {
      ai_insights_enabled?: boolean;
      smart_suggestions_cache?: Record<number, any>;
    };
  };
  
  anagraphics: {
    data: Anagraphics[];
    total: number;
    lastFetch: string | null;
    enhanced_data?: any; // Scores, reliability, etc.
  };
  
  // Smart Reconciliation V4.0 State
  smartReconciliation: SmartReconciliationState;
  
  // Recently viewed items V4.0
  recentInvoices: Invoice[];
  recentTransactions: BankTransaction[];
  recentAnagraphics: Anagraphics[];
  
  // AI Insights V4.0
  aiInsights: AIInsights;
  
  // Performance tracking V4.0
  performanceMetrics: {
    api_response_times?: Record<string, number>;
    cache_hit_rates?: Record<string, number>;
    last_performance_check?: string;
  };
  
  // Actions V4.0
  setDashboardData: (data: DashboardData) => void;
  setInvoices: (data: Invoice[], total: number, enhanced?: any) => void;
  setTransactions: (data: BankTransaction[], total: number, enhanced?: any) => void;
  setAnagraphics: (data: Anagraphics[], total: number, enhanced?: any) => void;
  addRecentInvoice: (invoice: Invoice) => void;
  addRecentTransaction: (transaction: BankTransaction) => void;
  addRecentAnagraphics: (anagraphics: Anagraphics) => void;
  updateInvoice: (id: number, updates: Partial<Invoice>) => void;
  updateTransaction: (id: number, updates: Partial<BankTransaction>) => void;
  updateAnagraphics: (id: number, updates: Partial<Anagraphics>) => void;
  removeInvoice: (id: number) => void;
  removeTransaction: (id: number) => void;
  removeAnagraphics: (id: number) => void;
  clearCache: () => void;
  
  // V4.0 New Actions
  updateAnalyticsV3: (data: Partial<AnalyticsV3State>) => void;
  updateSmartReconciliation: (data: Partial<SmartReconciliationState>) => void;
  updateAIInsights: (insights: Partial<AIInsights>) => void;
  setSmartSuggestionsCache: (transactionId: number, suggestions: any[]) => void;
  updatePerformanceMetrics: (metrics: Partial<DataStateV4['performanceMetrics']>) => void;
  invalidateCache: (type: 'invoices' | 'transactions' | 'anagraphics' | 'all') => void;
  enableV4Features: () => void;
}

export const useDataStore = create<DataStateV4>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state V4.0
        dashboardData: null,
        dashboardLastUpdated: null,
        
        analyticsV3: {
          executive_dashboard: null,
          operations_dashboard: null,
          real_time_metrics: null,
          ai_insights: {},
          cached_reports: {},
          ultra_features_enabled: true,
        },
        
        invoices: {
          data: [],
          total: 0,
          lastFetch: null,
          enhanced_data: null,
        },
        
        transactions: {
          data: [],
          total: 0,
          lastFetch: null,
          enhanced_data: null,
          v4_features: {
            ai_insights_enabled: true,
            smart_suggestions_cache: {},
          },
        },
        
        anagraphics: {
          data: [],
          total: 0,
          lastFetch: null,
          enhanced_data: null,
        },
        
        smartReconciliation: {
          ai_enhanced_suggestions: [],
          pattern_analysis: null,
          client_reliability_data: {},
          ultra_suggestions_cache: {},
          performance_metrics: null,
          learning_enabled: true,
        },
        
        recentInvoices: [],
        recentTransactions: [],
        recentAnagraphics: [],
        
        aiInsights: {
          business_insights: null,
          predictions: null,
          recommendations: [],
          confidence_score: 0,
          last_updated: null,
        },
        
        performanceMetrics: {
          api_response_times: {},
          cache_hit_rates: {},
          last_performance_check: null,
        },
        
        // Actions V4.0
        setDashboardData: (data) => set((state) => {
          state.dashboardData = data;
          state.dashboardLastUpdated = new Date().toISOString();
        }),
        
        setInvoices: (data, total, enhanced) => set((state) => {
          state.invoices.data = data;
          state.invoices.total = total;
          state.invoices.lastFetch = new Date().toISOString();
          if (enhanced) {
            state.invoices.enhanced_data = enhanced;
          }
        }),
        
        setTransactions: (data, total, enhanced) => set((state) => {
          state.transactions.data = data;
          state.transactions.total = total;
          state.transactions.lastFetch = new Date().toISOString();
          if (enhanced) {
            state.transactions.enhanced_data = enhanced;
          }
        }),
        
        setAnagraphics: (data, total, enhanced) => set((state) => {
          state.anagraphics.data = data;
          state.anagraphics.total = total;
          state.anagraphics.lastFetch = new Date().toISOString();
          if (enhanced) {
            state.anagraphics.enhanced_data = enhanced;
          }
        }),
        
        addRecentInvoice: (invoice) => set((state) => {
          state.recentInvoices = state.recentInvoices.filter(i => i.id !== invoice.id);
          state.recentInvoices.unshift(invoice);
          state.recentInvoices = state.recentInvoices.slice(0, 10);
        }),
        
        addRecentTransaction: (transaction) => set((state) => {
          state.recentTransactions = state.recentTransactions.filter(t => t.id !== transaction.id);
          state.recentTransactions.unshift(transaction);
          state.recentTransactions = state.recentTransactions.slice(0, 10);
        }),
        
        addRecentAnagraphics: (anagraphics) => set((state) => {
          state.recentAnagraphics = state.recentAnagraphics.filter(a => a.id !== anagraphics.id);
          state.recentAnagraphics.unshift(anagraphics);
          state.recentAnagraphics = state.recentAnagraphics.slice(0, 10);
        }),
        
        updateInvoice: (id, updates) => set((state) => {
          // Update in main list
          const index = state.invoices.data.findIndex(i => i.id === id);
          if (index !== -1) {
            state.invoices.data[index] = { ...state.invoices.data[index], ...updates };
          }
          
          // Update in recent list
          const recentIndex = state.recentInvoices.findIndex(i => i.id === id);
          if (recentIndex !== -1) {
            state.recentInvoices[recentIndex] = { ...state.recentInvoices[recentIndex], ...updates };
          }
          
          // Update in dashboard if present
          if (state.dashboardData?.recent_invoices) {
            const dashIndex = state.dashboardData.recent_invoices.findIndex(i => i.id === id);
            if (dashIndex !== -1) {
              state.dashboardData.recent_invoices[dashIndex] = { 
                ...state.dashboardData.recent_invoices[dashIndex], 
                ...updates 
              };
            }
          }
        }),
        
        updateTransaction: (id, updates) => set((state) => {
          const index = state.transactions.data.findIndex(t => t.id === id);
          if (index !== -1) {
            state.transactions.data[index] = { ...state.transactions.data[index], ...updates };
          }
          
          const recentIndex = state.recentTransactions.findIndex(t => t.id === id);
          if (recentIndex !== -1) {
            state.recentTransactions[recentIndex] = { ...state.recentTransactions[recentIndex], ...updates };
          }
          
          if (state.dashboardData?.recent_transactions) {
            const dashIndex = state.dashboardData.recent_transactions.findIndex(t => t.id === id);
            if (dashIndex !== -1) {
              state.dashboardData.recent_transactions[dashIndex] = { 
                ...state.dashboardData.recent_transactions[dashIndex], 
                ...updates 
              };
            }
          }
        }),
        
        updateAnagraphics: (id, updates) => set((state) => {
          const index = state.anagraphics.data.findIndex(a => a.id === id);
          if (index !== -1) {
            state.anagraphics.data[index] = { ...state.anagraphics.data[index], ...updates };
          }
          
          const recentIndex = state.recentAnagraphics.findIndex(a => a.id === id);
          if (recentIndex !== -1) {
            state.recentAnagraphics[recentIndex] = { ...state.recentAnagraphics[recentIndex], ...updates };
          }
        }),
        
        removeInvoice: (id) => set((state) => {
          state.invoices.data = state.invoices.data.filter(i => i.id !== id);
          state.invoices.total = Math.max(0, state.invoices.total - 1);
          state.recentInvoices = state.recentInvoices.filter(i => i.id !== id);
          
          if (state.dashboardData?.recent_invoices) {
            state.dashboardData.recent_invoices = state.dashboardData.recent_invoices.filter(i => i.id !== id);
          }
        }),
        
        removeTransaction: (id) => set((state) => {
          state.transactions.data = state.transactions.data.filter(t => t.id !== id);
          state.transactions.total = Math.max(0, state.transactions.total - 1);
          state.recentTransactions = state.recentTransactions.filter(t => t.id !== id);
          
          // Clear smart suggestions cache for this transaction
          if (state.transactions.v4_features?.smart_suggestions_cache?.[id]) {
            delete state.transactions.v4_features.smart_suggestions_cache[id];
          }
          
          if (state.dashboardData?.recent_transactions) {
            state.dashboardData.recent_transactions = state.dashboardData.recent_transactions.filter(t => t.id !== id);
          }
        }),
        
        removeAnagraphics: (id) => set((state) => {
          state.anagraphics.data = state.anagraphics.data.filter(a => a.id !== id);
          state.anagraphics.total = Math.max(0, state.anagraphics.total - 1);
          state.recentAnagraphics = state.recentAnagraphics.filter(a => a.id !== id);
          
          // Clear client reliability data
          if (state.smartReconciliation.client_reliability_data?.[id]) {
            delete state.smartReconciliation.client_reliability_data[id];
          }
        }),
        
        clearCache: () => set((state) => {
          state.invoices = { data: [], total: 0, lastFetch: null, enhanced_data: null };
          state.transactions = { 
            data: [], 
            total: 0, 
            lastFetch: null, 
            enhanced_data: null,
            v4_features: {
              ai_insights_enabled: true,
              smart_suggestions_cache: {},
            }
          };
          state.anagraphics = { data: [], total: 0, lastFetch: null, enhanced_data: null };
          state.dashboardData = null;
          state.dashboardLastUpdated = null;
          state.analyticsV3.cached_reports = {};
          state.smartReconciliation.ultra_suggestions_cache = {};
        }),
        
        // V4.0 New Actions
        updateAnalyticsV3: (data) => set((state) => {
          state.analyticsV3 = { ...state.analyticsV3, ...data };
        }),
        
        updateSmartReconciliation: (data) => set((state) => {
          state.smartReconciliation = { ...state.smartReconciliation, ...data };
        }),
        
        updateAIInsights: (insights) => set((state) => {
          state.aiInsights = { 
            ...state.aiInsights, 
            ...insights,
            last_updated: new Date().toISOString()
          };
        }),
        
        setSmartSuggestionsCache: (transactionId, suggestions) => set((state) => {
          if (!state.transactions.v4_features) {
            state.transactions.v4_features = { smart_suggestions_cache: {} };
          }
          if (!state.transactions.v4_features.smart_suggestions_cache) {
            state.transactions.v4_features.smart_suggestions_cache = {};
          }
          state.transactions.v4_features.smart_suggestions_cache[transactionId] = {
            suggestions,
            cached_at: new Date().toISOString(),
            ttl: 5 * 60 * 1000, // 5 minutes
          };
        }),
        
        updatePerformanceMetrics: (metrics) => set((state) => {
          state.performanceMetrics = { 
            ...state.performanceMetrics, 
            ...metrics,
            last_performance_check: new Date().toISOString()
          };
        }),
        
        invalidateCache: (type) => set((state) => {
          if (type === 'all' || type === 'invoices') {
            state.invoices.lastFetch = null;
            state.invoices.enhanced_data = null;
          }
          if (type === 'all' || type === 'transactions') {
            state.transactions.lastFetch = null;
            state.transactions.enhanced_data = null;
            if (state.transactions.v4_features) {
              state.transactions.v4_features.smart_suggestions_cache = {};
            }
          }
          if (type === 'all' || type === 'anagraphics') {
            state.anagraphics.lastFetch = null;
            state.anagraphics.enhanced_data = null;
          }
          if (type === 'all') {
            state.analyticsV3.cached_reports = {};
            state.smartReconciliation.ultra_suggestions_cache = {};
          }
        }),
        
        enableV4Features: () => set((state) => {
          if (!state.transactions.v4_features) {
            state.transactions.v4_features = {
              ai_insights_enabled: true,
              smart_suggestions_cache: {},
            };
          }
          state.transactions.v4_features.ai_insights_enabled = true;
          state.smartReconciliation.learning_enabled = true;
          state.analyticsV3.ultra_features_enabled = true;
        }),
      }))
    ),
    { name: 'DataStoreV4' }
  )
);

// ===== RECONCILIATION STORE V4.0 =====
interface ReconciliationStateV4 {
  // Current reconciliation session V4.0
  selectedInvoices: Invoice[];
  selectedTransactions: BankTransaction[];
  suggestions: any[];
  opportunities: any[];
  
  // V4.0 Smart Features
  ultraSmartSuggestions: any[];
  aiEnhancedMatches: any[];
  clientReliabilityAnalysis: Record<number, any>;
  patternAnalysis: any;
  
  // Drag & drop state V4.0
  draggedItem: { 
    type: 'invoice' | 'transaction'; 
    data: Invoice | BankTransaction;
    ai_confidence?: number;
  } | null;
  dropTarget: { 
    type: 'invoice' | 'transaction'; 
    id: number;
    compatibility_score?: number;
  } | null;
  
  // Reconciliation history V4.0
  recentReconciliations: any[];
  
  // V4.0 Performance & Learning
  performanceMetrics: {
    success_rate?: number;
    average_confidence?: number;
    ai_accuracy?: number;
    learning_progress?: number;
  };
  
  // V4.0 Configuration
  config: {
    enable_ai_validation?: boolean;
    enable_pattern_learning?: boolean;
    auto_apply_high_confidence?: boolean;
    confidence_threshold?: number;
    real_time_suggestions?: boolean;
  };
  
  // Actions V4.0
  addSelectedInvoice: (invoice: Invoice) => void;
  removeSelectedInvoice: (id: number) => void;
  addSelectedTransaction: (transaction: BankTransaction) => void;
  removeSelectedTransaction: (id: number) => void;
  clearSelection: () => void;
  setSuggestions: (suggestions: any[]) => void;
  setOpportunities: (opportunities: any[]) => void;
  setDraggedItem: (item: ReconciliationStateV4['draggedItem']) => void;
  setDropTarget: (target: ReconciliationStateV4['dropTarget']) => void;
  addRecentReconciliation: (reconciliation: any) => void;
  clearReconciliationState: () => void;
  
  // V4.0 New Actions
  setUltraSmartSuggestions: (suggestions: any[]) => void;
  setAIEnhancedMatches: (matches: any[]) => void;
  updateClientReliabilityAnalysis: (anagraphicsId: number, analysis: any) => void;
  updatePatternAnalysis: (analysis: any) => void;
  updatePerformanceMetrics: (metrics: Partial<ReconciliationStateV4['performanceMetrics']>) => void;
  updateConfig: (config: Partial<ReconciliationStateV4['config']>) => void;
  enableAIFeatures: () => void;
  disableAIFeatures: () => void;
  resetLearningData: () => void;
}

export const useReconciliationStore = create<ReconciliationStateV4>()(
  devtools(
    immer((set, get) => ({
      // Initial state V4.0
      selectedInvoices: [],
      selectedTransactions: [],
      suggestions: [],
      opportunities: [],
      
      ultraSmartSuggestions: [],
      aiEnhancedMatches: [],
      clientReliabilityAnalysis: {},
      patternAnalysis: null,
      
      draggedItem: null,
      dropTarget: null,
      recentReconciliations: [],
      
      performanceMetrics: {
        success_rate: 0,
        average_confidence: 0,
        ai_accuracy: 0,
        learning_progress: 0,
      },
      
      config: {
        enable_ai_validation: true,
        enable_pattern_learning: true,
        auto_apply_high_confidence: false,
        confidence_threshold: 0.8,
        real_time_suggestions: false,
      },
      
      // Actions V4.0
      addSelectedInvoice: (invoice) => set((state) => {
        if (!state.selectedInvoices.find(i => i.id === invoice.id)) {
          state.selectedInvoices.push(invoice);
        }
      }),
      
      removeSelectedInvoice: (id) => set((state) => {
        state.selectedInvoices = state.selectedInvoices.filter(i => i.id !== id);
      }),
      
      addSelectedTransaction: (transaction) => set((state) => {
        if (!state.selectedTransactions.find(t => t.id === transaction.id)) {
          state.selectedTransactions.push(transaction);
        }
      }),
      
      removeSelectedTransaction: (id) => set((state) => {
        state.selectedTransactions = state.selectedTransactions.filter(t => t.id !== id);
      }),
      
      clearSelection: () => set((state) => {
        state.selectedInvoices = [];
        state.selectedTransactions = [];
      }),
      
      setSuggestions: (suggestions) => set((state) => {
        state.suggestions = suggestions;
      }),
      
      setOpportunities: (opportunities) => set((state) => {
        state.opportunities = opportunities;
      }),
      
      setDraggedItem: (item) => set((state) => {
        state.draggedItem = item;
      }),
      
      setDropTarget: (target) => set((state) => {
        state.dropTarget = target;
      }),
      
      addRecentReconciliation: (reconciliation) => set((state) => {
        state.recentReconciliations.unshift({
          ...reconciliation,
          timestamp: new Date().toISOString(),
        });
        state.recentReconciliations = state.recentReconciliations.slice(0, 50);
      }),
      
      clearReconciliationState: () => set((state) => {
        state.selectedInvoices = [];
        state.selectedTransactions = [];
        state.draggedItem = null;
        state.dropTarget = null;
        state.suggestions = [];
        state.opportunities = [];
        state.ultraSmartSuggestions = [];
        state.aiEnhancedMatches = [];
      }),
      
      // V4.0 New Actions
      setUltraSmartSuggestions: (suggestions) => set((state) => {
        state.ultraSmartSuggestions = suggestions;
        // Update performance metrics
        if (suggestions.length > 0) {
          const avgConfidence = suggestions.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / suggestions.length;
          state.performanceMetrics.average_confidence = avgConfidence;
        }
      }),
      
      setAIEnhancedMatches: (matches) => set((state) => {
        state.aiEnhancedMatches = matches;
      }),
      
      updateClientReliabilityAnalysis: (anagraphicsId, analysis) => set((state) => {
        state.clientReliabilityAnalysis[anagraphicsId] = {
          ...analysis,
          last_updated: new Date().toISOString(),
        };
      }),
      
      updatePatternAnalysis: (analysis) => set((state) => {
        state.patternAnalysis = {
          ...analysis,
          last_updated: new Date().toISOString(),
        };
      }),
      
      updatePerformanceMetrics: (metrics) => set((state) => {
        state.performanceMetrics = { ...state.performanceMetrics, ...metrics };
      }),
      
      updateConfig: (config) => set((state) => {
        state.config = { ...state.config, ...config };
      }),
      
      enableAIFeatures: () => set((state) => {
        state.config.enable_ai_validation = true;
        state.config.enable_pattern_learning = true;
        state.config.real_time_suggestions = true;
      }),
      
      disableAIFeatures: () => set((state) => {
        state.config.enable_ai_validation = false;
        state.config.enable_pattern_learning = false;
        state.config.real_time_suggestions = false;
        state.config.auto_apply_high_confidence = false;
      }),
      
      resetLearningData: () => set((state) => {
        state.clientReliabilityAnalysis = {};
        state.patternAnalysis = null;
        state.performanceMetrics = {
          success_rate: 0,
          average_confidence: 0,
          ai_accuracy: 0,
          learning_progress: 0,
        };
      }),
    })),
    { name: 'ReconciliationStoreV4' }
  )
);

// ===== IMPORT/EXPORT STORE V4.0 =====
interface ImportExportStateV4 {
  // Current import/export operations
  activeImports: Record<string, {
    id: string;
    type: 'invoices' | 'transactions' | 'anagraphics';
    status: 'uploading' | 'processing' | 'validating' | 'importing' | 'completed' | 'error';
    progress?: number;
    file_name?: string;
    total_records?: number;
    processed_records?: number;
    errors?: any[];
    started_at?: string;
    completed_at?: string;
  }>;
  
  activeExports: Record<string, {
    id: string;
    type: 'invoices' | 'transactions' | 'anagraphics' | 'reconciliation_report';
    status: 'preparing' | 'exporting' | 'completed' | 'error';
    format: 'excel' | 'csv' | 'json' | 'pdf';
    progress?: number;
    file_url?: string;
    started_at?: string;
    completed_at?: string;
  }>;
  
  // Import/Export history
  importHistory: any[];
  exportHistory: any[];
  
  // Templates and validation
  availableTemplates: Record<string, any>;
  validationRules: Record<string, any>;
  
  // Statistics
  statistics: {
    total_imports?: number;
    total_exports?: number;
    success_rate?: number;
    last_activity?: string;
  };
  
  // Actions
  startImport: (type: string, fileInfo: any) => string;
  updateImportProgress: (id: string, progress: Partial<ImportExportStateV4['activeImports'][string]>) => void;
  completeImport: (id: string, result: any) => void;
  startExport: (type: string, format: string, filters?: any) => string;
  updateExportProgress: (id: string, progress: Partial<ImportExportStateV4['activeExports'][string]>) => void;
  completeExport: (id: string, fileUrl: string) => void;
  clearHistory: () => void;
  updateStatistics: (stats: Partial<ImportExportStateV4['statistics']>) => void;
}

export const useImportExportStore = create<ImportExportStateV4>()(
  devtools(
    immer((set, get) => ({
      activeImports: {},
      activeExports: {},
      importHistory: [],
      exportHistory: [],
      availableTemplates: {},
      validationRules: {},
      statistics: {
        total_imports: 0,
        total_exports: 0,
        success_rate: 0,
        last_activity: null,
      },
      
      startImport: (type, fileInfo) => {
        const id = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set((state) => {
          state.activeImports[id] = {
            id,
            type: type as any,
            status: 'uploading',
            progress: 0,
            file_name: fileInfo.name,
            started_at: new Date().toISOString(),
          };
        });
        return id;
      },
      
      updateImportProgress: (id, progress) => set((state) => {
        if (state.activeImports[id]) {
          state.activeImports[id] = { ...state.activeImports[id], ...progress };
        }
      }),
      
      completeImport: (id, result) => set((state) => {
        if (state.activeImports[id]) {
          const importRecord = {
            ...state.activeImports[id],
            status: result.success ? 'completed' : 'error',
            completed_at: new Date().toISOString(),
            ...result,
          };
          
          state.importHistory.unshift(importRecord);
          state.importHistory = state.importHistory.slice(0, 100);
          delete state.activeImports[id];
          
          state.statistics.total_imports = (state.statistics.total_imports || 0) + 1;
          state.statistics.last_activity = new Date().toISOString();
        }
      }),
      
      startExport: (type, format, filters) => {
        const id = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        set((state) => {
          state.activeExports[id] = {
            id,
            type: type as any,
            format: format as any,
            status: 'preparing',
            progress: 0,
            started_at: new Date().toISOString(),
          };
        });
        return id;
      },
      
      updateExportProgress: (id, progress) => set((state) => {
        if (state.activeExports[id]) {
          state.activeExports[id] = { ...state.activeExports[id], ...progress };
        }
      }),
      
      completeExport: (id, fileUrl) => set((state) => {
        if (state.activeExports[id]) {
          const exportRecord = {
            ...state.activeExports[id],
            status: 'completed' as const,
            file_url: fileUrl,
            completed_at: new Date().toISOString(),
          };
          
          state.exportHistory.unshift(exportRecord);
          state.exportHistory = state.exportHistory.slice(0, 100);
          delete state.activeExports[id];
          
          state.statistics.total_exports = (state.statistics.total_exports || 0) + 1;
          state.statistics.last_activity = new Date().toISOString();
        }
      }),
      
      clearHistory: () => set((state) => {
        state.importHistory = [];
        state.exportHistory = [];
      }),
      
      updateStatistics: (stats) => set((state) => {
        state.statistics = { ...state.statistics, ...stats };
      }),
    })),
    { name: 'ImportExportStoreV4' }
  )
);

// ===== SYNC STORE V4.0 =====
interface SyncStateV4 {
  // Sync status
  isEnabled: boolean;
  lastSync: string | null;
  syncStatus: 'idle' | 'syncing' | 'uploading' | 'downloading' | 'error';
  autoSyncEnabled: boolean;
  autoSyncInterval: number; // seconds
  
  // Sync configuration
  config: {
    google_drive_enabled?: boolean;
    backup_enabled?: boolean;
    auto_backup_interval?: number;
    sync_on_changes?: boolean;
    conflict_resolution?: 'local' | 'remote' | 'manual';
  };
  
  // Sync history and logs
  syncHistory: any[];
  syncLogs: any[];
  
  // Remote file info
  remoteFileInfo: {
    exists?: boolean;
    size?: number;
    last_modified?: string;
    version?: string;
  };
  
  // Statistics
  statistics: {
    total_syncs?: number;
    successful_syncs?: number;
    failed_syncs?: number;
    data_uploaded?: number; // bytes
    data_downloaded?: number; // bytes
    last_backup?: string;
  };
  
  // Actions
  setSyncStatus: (status: SyncStateV4['syncStatus']) => void;
  updateSyncConfig: (config: Partial<SyncStateV4['config']>) => void;
  addSyncLog: (log: any) => void;
  updateRemoteFileInfo: (info: Partial<SyncStateV4['remoteFileInfo']>) => void;
  updateStatistics: (stats: Partial<SyncStateV4['statistics']>) => void;
  enableSync: () => void;
  disableSync: () => void;
  toggleAutoSync: () => void;
  setAutoSyncInterval: (interval: number) => void;
  recordSyncActivity: (activity: any) => void;
  clearSyncHistory: () => void;
}

export const useSyncStore = create<SyncStateV4>()(
  devtools(
    persist(
      immer((set, get) => ({
        isEnabled: false,
        lastSync: null,
        syncStatus: 'idle',
        autoSyncEnabled: false,
        autoSyncInterval: 3600, // 1 hour
        
        config: {
          google_drive_enabled: false,
          backup_enabled: true,
          auto_backup_interval: 86400, // 24 hours
          sync_on_changes: false,
          conflict_resolution: 'manual',
        },
        
        syncHistory: [],
        syncLogs: [],
        
        remoteFileInfo: {
          exists: false,
        },
        
        statistics: {
          total_syncs: 0,
          successful_syncs: 0,
          failed_syncs: 0,
          data_uploaded: 0,
          data_downloaded: 0,
          last_backup: null,
        },
        
        setSyncStatus: (status) => set((state) => {
          state.syncStatus = status;
          if (status === 'idle') {
            state.lastSync = new Date().toISOString();
          }
        }),
        
        updateSyncConfig: (config) => set((state) => {
          state.config = { ...state.config, ...config };
        }),
        
        addSyncLog: (log) => set((state) => {
          state.syncLogs.unshift({
            ...log,
            timestamp: new Date().toISOString(),
          });
          state.syncLogs = state.syncLogs.slice(0, 200);
        }),
        
        updateRemoteFileInfo: (info) => set((state) => {
          state.remoteFileInfo = { ...state.remoteFileInfo, ...info };
        }),
        
        updateStatistics: (stats) => set((state) => {
          state.statistics = { ...state.statistics, ...stats };
        }),
        
        enableSync: () => set((state) => {
          state.isEnabled = true;
          state.config.google_drive_enabled = true;
        }),
        
        disableSync: () => set((state) => {
          state.isEnabled = false;
          state.autoSyncEnabled = false;
          state.syncStatus = 'idle';
        }),
        
        toggleAutoSync: () => set((state) => {
          state.autoSyncEnabled = !state.autoSyncEnabled;
        }),
        
        setAutoSyncInterval: (interval) => set((state) => {
          state.autoSyncInterval = interval;
        }),
        
        recordSyncActivity: (activity) => set((state) => {
          state.syncHistory.unshift({
            ...activity,
            timestamp: new Date().toISOString(),
          });
          state.syncHistory = state.syncHistory.slice(0, 50);
          
          // Update statistics
          state.statistics.total_syncs = (state.statistics.total_syncs || 0) + 1;
          if (activity.success) {
            state.statistics.successful_syncs = (state.statistics.successful_syncs || 0) + 1;
          } else {
            state.statistics.failed_syncs = (state.statistics.failed_syncs || 0) + 1;
          }
        }),
        
        clearSyncHistory: () => set((state) => {
          state.syncHistory = [];
          state.syncLogs = [];
        }),
      })),
      {
        name: 'fattura-analyzer-sync-v4',
        partialize: (state) => ({
          isEnabled: state.isEnabled,
          autoSyncEnabled: state.autoSyncEnabled,
          autoSyncInterval: state.autoSyncInterval,
          config: state.config,
          statistics: state.statistics,
        }),
      }
    ),
    { name: 'SyncStoreV4' }
  )
);

// ===== UTILITY SELECTORS V4.0 =====
export const useTheme = () => useUIStore(state => state.theme);
export const useLoading = (key?: string) => useUIStore(state => 
  key ? state.loading[key] || false : Object.keys(state.loading).length > 0
);
export const useError = (key?: string) => useUIStore(state => 
  key ? state.errors[key] || null : Object.values(state.errors).filter(Boolean)[0] || null
);
export const useNotifications = () => useUIStore(state => state.notifications);
export const useSettings = () => useUIStore(state => state.settings);
export const useSystemStatus = () => useUIStore(state => state.systemStatus);
export const useFirstRunState = () => useUIStore(state => state.firstRunState);

// V4.0 New Selectors
export const useAIFeaturesEnabled = () => useUIStore(state => state.settings.ai_features_enabled);
export const useSmartReconciliationEnabled = () => useUIStore(state => state.settings.smart_reconciliation_enabled);
export const useRealTimeUpdates = () => useUIStore(state => state.settings.real_time_updates);
export const useCachePreferences = () => useUIStore(state => state.settings.cache_preferences);
export const useUIPreferences = () => useUIStore(state => state.settings.ui_preferences);

// Data selectors V4.0
export const useDashboardData = () => useDataStore(state => state.dashboardData);
export const useInvoicesCache = () => useDataStore(state => state.invoices);
export const useTransactionsCache = () => useDataStore(state => state.transactions);
export const useAnagraphicsCache = () => useDataStore(state => state.anagraphics);
export const useAnalyticsV3 = () => useDataStore(state => state.analyticsV3);
export const useSmartReconciliationData = () => useDataStore(state => state.smartReconciliation);
export const useAIInsights = () => useDataStore(state => state.aiInsights);
export const usePerformanceMetrics = () => useDataStore(state => state.performanceMetrics);

// Reconciliation selectors V4.0
export const useSelectedInvoices = () => useReconciliationStore(state => state.selectedInvoices);
export const useSelectedTransactions = () => useReconciliationStore(state => state.selectedTransactions);
export const useReconciliationSuggestions = () => useReconciliationStore(state => state.suggestions);
export const useUltraSmartSuggestions = () => useReconciliationStore(state => state.ultraSmartSuggestions);
export const useAIEnhancedMatches = () => useReconciliationStore(state => state.aiEnhancedMatches);
export const useReconciliationConfig = () => useReconciliationStore(state => state.config);
export const useReconciliationPerformance = () => useReconciliationStore(state => state.performanceMetrics);

// Import/Export selectors V4.0
export const useActiveImports = () => useImportExportStore(state => state.activeImports);
export const useActiveExports = () => useImportExportStore(state => state.activeExports);
export const useImportHistory = () => useImportExportStore(state => state.importHistory);
export const useExportHistory = () => useImportExportStore(state => state.exportHistory);
export const useImportExportStatistics = () => useImportExportStore(state => state.statistics);

// Sync selectors V4.0
export const useSyncStatus = () => useSyncStore(state => state.syncStatus);
export const useSyncEnabled = () => useSyncStore(state => state.isEnabled);
export const useAutoSyncEnabled = () => useSyncStore(state => state.autoSyncEnabled);
export const useSyncConfig = () => useSyncStore(state => state.config);
export const useSyncHistory = () => useSyncStore(state => state.syncHistory);
export const useSyncStatistics = () => useSyncStore(state => state.statistics);
export const useRemoteFileInfo = () => useSyncStore(state => state.remoteFileInfo);

// ===== ADVANCED SELECTORS V4.0 =====

// Combined data selectors
export const useIsDataLoading = () => {
  const loading = useUIStore(state => state.loading);
  return Object.keys(loading).some(key => 
    key.includes('invoices') || key.includes('transactions') || key.includes('anagraphics')
  );
};

export const useHasDataErrors = () => {
  const errors = useUIStore(state => state.errors);
  return Object.keys(errors).some(key => 
    key.includes('invoices') || key.includes('transactions') || key.includes('anagraphics')
  );
};

export const useDataFreshness = () => {
  const invoicesCache = useInvoicesCache();
  const transactionsCache = useTransactionsCache();
  const anagraphicsCache = useAnagraphicsCache();
  
  return {
    invoices: invoicesCache.lastFetch,
    transactions: transactionsCache.lastFetch,
    anagraphics: anagraphicsCache.lastFetch,
  };
};

// Smart features selectors
export const useSmartFeaturesEnabled = () => {
  const aiEnabled = useAIFeaturesEnabled();
  const smartReconciliation = useSmartReconciliationEnabled();
  const realTime = useRealTimeUpdates();
  
  return {
    ai_features: aiEnabled,
    smart_reconciliation: smartReconciliation,
    real_time_updates: realTime,
    all_enabled: aiEnabled && smartReconciliation,
  };
};

export const useSystemHealth = () => {
  const systemStatus = useSystemStatus();
  const syncStatus = useSyncStatus();
  const performanceMetrics = usePerformanceMetrics();
  
  return {
    backend_healthy: systemStatus.backend_version !== 'unknown',
    sync_healthy: syncStatus !== 'error',
    performance_good: performanceMetrics.last_performance_check !== null,
    overall_healthy: systemStatus.backend_version !== 'unknown' && syncStatus !== 'error',
  };
};

// Activity indicators
export const useHasActiveOperations = () => {
  const activeImports = useActiveImports();
  const activeExports = useActiveExports();
  const syncStatus = useSyncStatus();
  const isLoading = useIsDataLoading();
  
  return {
    importing: Object.keys(activeImports).length > 0,
    exporting: Object.keys(activeExports).length > 0,
    syncing: syncStatus === 'syncing',
    loading: isLoading,
    any_active: Object.keys(activeImports).length > 0 || 
               Object.keys(activeExports).length > 0 || 
               syncStatus === 'syncing' || 
               isLoading,
  };
};

// ===== STORE ACTIONS HELPERS V4.0 =====

// Helper to reset all stores
export const resetAllStores = () => {
  useUIStore.getState().clearErrors();
  useUIStore.getState().clearNotifications();
  useDataStore.getState().clearCache();
  useReconciliationStore.getState().clearReconciliationState();
  useImportExportStore.getState().clearHistory();
  useSyncStore.getState().clearSyncHistory();
};

// Helper to enable all V4.0 features
export const enableAllV4Features = () => {
  useUIStore.getState().enableAIFeatures();
  useUIStore.getState().setRealTimeUpdates(true);
  useDataStore.getState().enableV4Features();
  useReconciliationStore.getState().enableAIFeatures();
};

// Helper to disable all V4.0 features
export const disableAllV4Features = () => {
  useUIStore.getState().disableAIFeatures();
  useUIStore.getState().setRealTimeUpdates(false);
  useReconciliationStore.getState().disableAIFeatures();
};

// Helper to check if first run is needed
export const useIsFirstRun = () => {
  const firstRunState = useFirstRunState();
  const systemStatus = useSystemStatus();
  
  return firstRunState.is_first_run || 
         !firstRunState.setup_completed || 
         systemStatus.backend_version === 'unknown';
};

// ===== STORE PERSISTENCE HELPERS V4.0 =====

// Helper to export store state for backup
export const exportStoreState = () => {
  return {
    ui: useUIStore.getState(),
    data: {
      // Only export cache metadata, not full data
      invoices: {
        total: useDataStore.getState().invoices.total,
        lastFetch: useDataStore.getState().invoices.lastFetch,
      },
      transactions: {
        total: useDataStore.getState().transactions.total,
        lastFetch: useDataStore.getState().transactions.lastFetch,
      },
      anagraphics: {
        total: useDataStore.getState().anagraphics.total,
        lastFetch: useDataStore.getState().anagraphics.lastFetch,
      },
      performanceMetrics: useDataStore.getState().performanceMetrics,
    },
    reconciliation: {
      config: useReconciliationStore.getState().config,
      performanceMetrics: useReconciliationStore.getState().performanceMetrics,
    },
    sync: useSyncStore.getState(),
    importExport: {
      statistics: useImportExportStore.getState().statistics,
    },
    exported_at: new Date().toISOString(),
    version: '4.0',
  };
};

// Helper to get store statistics
export const getStoreStatistics = () => {
  const uiState = useUIStore.getState();
  const dataState = useDataStore.getState();
  const reconciliationState = useReconciliationStore.getState();
  const importExportState = useImportExportStore.getState();
  const syncState = useSyncStore.getState();
  
  return {
    cache_status: {
      invoices_cached: dataState.invoices.data.length,
      transactions_cached: dataState.transactions.data.length,
      anagraphics_cached: dataState.anagraphics.data.length,
      last_dashboard_update: dataState.dashboardLastUpdated,
    },
    features_enabled: {
      ai_features: uiState.settings.ai_features_enabled,
      smart_reconciliation: uiState.settings.smart_reconciliation_enabled,
      real_time_updates: uiState.settings.real_time_updates,
      sync_enabled: syncState.isEnabled,
    },
    activity: {
      notifications_count: uiState.notifications.length,
      active_imports: Object.keys(importExportState.activeImports).length,
      active_exports: Object.keys(importExportState.activeExports).length,
      recent_reconciliations: reconciliationState.recentReconciliations.length,
    },
    performance: {
      ...dataState.performanceMetrics,
      reconciliation_metrics: reconciliationState.performanceMetrics,
    },
    version: '4.0',
    generated_at: new Date().toISOString(),
  };
};

// Default export with all stores and utilities
export default {
  // Stores
  useUIStore,
  useDataStore,
  useReconciliationStore,
  useImportExportStore,
  useSyncStore,
  
  // Basic selectors
  useTheme,
  useLoading,
  useError,
  useNotifications,
  useSettings,
  
  // V4.0 selectors
  useAIFeaturesEnabled,
  useSmartReconciliationEnabled,
  useSmartFeaturesEnabled,
  useSystemHealth,
  useHasActiveOperations,
  useIsFirstRun,
  
  // Utilities
  resetAllStores,
  enableAllV4Features,
  disableAllV4Features,
  exportStoreState,
  getStoreStatistics,
};
