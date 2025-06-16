/**
 * Zustand Store V4.0 - Centralizzato e Ottimizzato - FIXED
 * Store completo per FatturaAnalyzer con tutte le features
 * RISOLTO: Eliminati export duplicati che causavano conflitti
 */

import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  Invoice, 
  BankTransaction, 
  Anagraphics, 
  NotificationConfig 
} from '@/types';

// ===== UI STORE =====
interface UIState {
  // Theme & Preferences
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  
  // Loading States
  loadingStates: Record<string, boolean>;
  
  // Error States
  errorStates: Record<string, string | null>;
  
  // Notifications
  notifications: NotificationConfig[];
  
  // Settings
  settings: {
    real_time_updates: boolean;
    enable_animations: boolean;
    auto_save: boolean;
    notification_sounds: boolean;
    compact_mode: boolean;
    items_per_page: number;
    language: 'it' | 'en';
    smart_reconciliation_enabled?: boolean;
    ai_features_enabled?: boolean;
  };
  
  // First Run State
  firstRunState: {
    is_first_run: boolean;
    setup_completed: boolean;
    current_step: string;
    wizard_data: Record<string, any>;
  };
  
  // System Status
  systemStatus: {
    backend_version?: string;
    last_health_check?: string;
    connection_status: 'connected' | 'disconnected' | 'connecting';
    user_authenticated?: boolean;
    last_auth_check?: string;
  };
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  addNotification: (notification: Omit<NotificationConfig, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  updateSettings: (settings: Partial<UIState['settings']>) => void;
  updateFirstRunState: (state: Partial<UIState['firstRunState']>) => void;
  updateSystemStatus: (status: Partial<UIState['systemStatus']>) => void;
  setRealTimeUpdates: (enabled: boolean) => void;
  disableAIFeatures: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        theme: 'system',
        sidebarCollapsed: false,
        loadingStates: {},
        errorStates: {},
        notifications: [],
        settings: {
          real_time_updates: false,
          enable_animations: true,
          auto_save: true,
          notification_sounds: false,
          compact_mode: false,
          items_per_page: 20,
          language: 'it',
          smart_reconciliation_enabled: true,
          ai_features_enabled: true,
        },
        firstRunState: {
          is_first_run: true,
          setup_completed: false,
          current_step: 'welcome',
          wizard_data: {},
        },
        systemStatus: {
          connection_status: 'disconnected',
          user_authenticated: false,
        },
        
        // Actions
        setTheme: (theme) => set((state) => {
          state.theme = theme;
        }),
        
        toggleSidebar: () => set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        }),
        
        setLoading: (key, loading) => set((state) => {
          state.loadingStates[key] = loading;
        }),
        
        setError: (key, error) => set((state) => {
          state.errorStates[key] = error;
        }),
        
        addNotification: (notification) => set((state) => {
          const id = Math.random().toString(36).substr(2, 9);
          state.notifications.push({
            id,
            timestamp: new Date().toISOString(),
            ...notification,
          });
        }),
        
        removeNotification: (id) => set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
        }),
        
        clearNotifications: () => set((state) => {
          state.notifications = [];
        }),
        
        updateSettings: (newSettings) => set((state) => {
          Object.assign(state.settings, newSettings);
        }),
        
        updateFirstRunState: (newState) => set((state) => {
          Object.assign(state.firstRunState, newState);
        }),
        
        updateSystemStatus: (status) => set((state) => {
          Object.assign(state.systemStatus, status);
        }),
        
        setRealTimeUpdates: (enabled) => set((state) => {
          state.settings.real_time_updates = enabled;
        }),
        
        disableAIFeatures: () => set((state) => {
          state.settings.ai_features_enabled = false;
          state.settings.smart_reconciliation_enabled = false;
        }),
      })),
      {
        name: 'ui-store-v4',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          settings: state.settings,
          firstRunState: state.firstRunState,
        }),
      }
    ),
    { name: 'UIStore-V4' }
  )
);

// ===== DATA STORE =====
interface DataState {
  // Invoices
  invoices: {
    items: Invoice[];
    total: number;
    lastFetch: number | null;
    enhanced_data?: any;
  };
  
  // Transactions
  transactions: {
    items: BankTransaction[];
    total: number;
    lastFetch: number | null;
    enhanced_data?: any;
  };
  
  // Anagraphics
  anagraphics: {
    items: Anagraphics[];
    total: number;
    lastFetch: number | null;
    enhanced_data?: any;
  };
  
  // Dashboard Data
  dashboardData: any;
  
  // Analytics V3
  analyticsV3: {
    executive_dashboard?: any;
    operations_dashboard?: any;
    real_time_metrics?: any;
    real_time_dashboard?: any;
    predictions?: any;
    ai_insights?: any;
  };
  
  // AI Insights
  aiInsights: {
    business_insights?: any;
    confidence_score?: number;
    recommendations?: any[];
  };
  
  // Performance Metrics
  performanceMetrics: {
    api_response_times?: Record<string, number>;
    cache_hit_rates?: Record<string, number>;
  };
  
  // Cache for smart suggestions
  smartSuggestionsCache: Record<number, any[]>;
  
  // Recent items for quick access
  recentInvoices: Invoice[];
  recentTransactions: BankTransaction[];
  
  // Actions
  setInvoices: (items: Invoice[], total: number, enhanced_data?: any) => void;
  addRecentInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: number, data: Partial<Invoice>) => void;
  
  setTransactions: (items: BankTransaction[], total: number, enhanced_data?: any) => void;
  addRecentTransaction: (transaction: BankTransaction) => void;
  updateTransaction: (id: number, data: Partial<BankTransaction>) => void;
  
  setAnagraphics: (items: Anagraphics[], total: number, enhanced_data?: any) => void;
  updateAnagraphics: (id: number, data: Partial<Anagraphics>) => void;
  
  setDashboardData: (data: any) => void;
  updateAnalyticsV3: (data: Partial<DataState['analyticsV3']>) => void;
  updateAIInsights: (insights: Partial<DataState['aiInsights']>) => void;
  updatePerformanceMetrics: (metrics: Partial<DataState['performanceMetrics']>) => void;
  
  setSmartSuggestionsCache: (transactionId: number, suggestions: any[]) => void;
  clearCache: () => void;
}

export const useDataStore = create<DataState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        invoices: { items: [], total: 0, lastFetch: null },
        transactions: { items: [], total: 0, lastFetch: null },
        anagraphics: { items: [], total: 0, lastFetch: null },
        dashboardData: null,
        analyticsV3: {},
        aiInsights: {},
        performanceMetrics: {},
        smartSuggestionsCache: {},
        recentInvoices: [],
        recentTransactions: [],
        
        // Invoice Actions
        setInvoices: (items, total, enhanced_data) => set((state) => {
          state.invoices = { items, total, lastFetch: Date.now(), enhanced_data };
        }),
        
        addRecentInvoice: (invoice) => set((state) => {
          state.recentInvoices = [invoice, ...state.recentInvoices.filter(i => i.id !== invoice.id)].slice(0, 10);
        }),
        
        updateInvoice: (id, data) => set((state) => {
          const index = state.invoices.items.findIndex(i => i.id === id);
          if (index !== -1) {
            Object.assign(state.invoices.items[index], data);
          }
        }),
        
        // Transaction Actions
        setTransactions: (items, total, enhanced_data) => set((state) => {
          state.transactions = { items, total, lastFetch: Date.now(), enhanced_data };
        }),
        
        addRecentTransaction: (transaction) => set((state) => {
          state.recentTransactions = [transaction, ...state.recentTransactions.filter(t => t.id !== transaction.id)].slice(0, 10);
        }),
        
        updateTransaction: (id, data) => set((state) => {
          const index = state.transactions.items.findIndex(t => t.id === id);
          if (index !== -1) {
            Object.assign(state.transactions.items[index], data);
          }
        }),
        
        // Anagraphics Actions
        setAnagraphics: (items, total, enhanced_data) => set((state) => {
          state.anagraphics = { items, total, lastFetch: Date.now(), enhanced_data };
        }),
        
        updateAnagraphics: (id, data) => set((state) => {
          const index = state.anagraphics.items.findIndex(a => a.id === id);
          if (index !== -1) {
            Object.assign(state.anagraphics.items[index], data);
          }
        }),
        
        // Dashboard & Analytics Actions
        setDashboardData: (data) => set((state) => {
          state.dashboardData = data;
        }),
        
        updateAnalyticsV3: (data) => set((state) => {
          Object.assign(state.analyticsV3, data);
        }),
        
        updateAIInsights: (insights) => set((state) => {
          Object.assign(state.aiInsights, insights);
        }),
        
        updatePerformanceMetrics: (metrics) => set((state) => {
          Object.assign(state.performanceMetrics, metrics);
        }),
        
        // Cache Actions
        setSmartSuggestionsCache: (transactionId, suggestions) => set((state) => {
          state.smartSuggestionsCache[transactionId] = suggestions;
        }),
        
        clearCache: () => set((state) => {
          state.invoices.lastFetch = null;
          state.transactions.lastFetch = null;
          state.anagraphics.lastFetch = null;
          state.smartSuggestionsCache = {};
        }),
      }))
    ),
    { name: 'DataStore-V4' }
  )
);

// ===== RECONCILIATION STORE =====
interface ReconciliationState {
  // Selected items for bulk operations
  selectedInvoices: Invoice[];
  selectedTransactions: BankTransaction[];
  
  // Drag & Drop state
  draggedItem: { type: 'invoice' | 'transaction'; data: any } | null;
  dropTarget: { type: 'invoice' | 'transaction'; id: number } | null;
  
  // Ultra Smart Suggestions
  ultraSmartSuggestions: any[];
  
  // Recent reconciliations
  recentReconciliations: any[];
  
  // Client reliability analysis cache
  clientReliabilityCache: Record<number, any>;
  
  // Opportunities
  opportunities: any[];
  
  // Performance metrics
  performanceMetrics: {
    success_rate?: number;
    average_confidence?: number;
    ai_accuracy?: number;
  };
  
  // Actions
  toggleInvoiceSelection: (invoice: Invoice) => void;
  toggleTransactionSelection: (transaction: BankTransaction) => void;
  clearSelection: () => void;
  
  setDraggedItem: (item: { type: 'invoice' | 'transaction'; data: any } | null) => void;
  setDropTarget: (target: { type: 'invoice' | 'transaction'; id: number } | null) => void;
  
  setUltraSmartSuggestions: (suggestions: any[]) => void;
  addRecentReconciliation: (reconciliation: any) => void;
  updateClientReliabilityAnalysis: (anagraphicsId: number, analysis: any) => void;
  setOpportunities: (opportunities: any[]) => void;
  updatePerformanceMetrics: (metrics: Partial<ReconciliationState['performanceMetrics']>) => void;
}

export const useReconciliationStore = create<ReconciliationState>()(
  devtools(
    immer((set, get) => ({
      // Initial State
      selectedInvoices: [],
      selectedTransactions: [],
      draggedItem: null,
      dropTarget: null,
      ultraSmartSuggestions: [],
      recentReconciliations: [],
      clientReliabilityCache: {},
      opportunities: [],
      performanceMetrics: {},
      
      // Selection Actions
      toggleInvoiceSelection: (invoice) => set((state) => {
        const index = state.selectedInvoices.findIndex(i => i.id === invoice.id);
        if (index !== -1) {
          state.selectedInvoices.splice(index, 1);
        } else {
          state.selectedInvoices.push(invoice);
        }
      }),
      
      toggleTransactionSelection: (transaction) => set((state) => {
        const index = state.selectedTransactions.findIndex(t => t.id === transaction.id);
        if (index !== -1) {
          state.selectedTransactions.splice(index, 1);
        } else {
          state.selectedTransactions.push(transaction);
        }
      }),
      
      clearSelection: () => set((state) => {
        state.selectedInvoices = [];
        state.selectedTransactions = [];
      }),
      
      // Drag & Drop Actions
      setDraggedItem: (item) => set((state) => {
        state.draggedItem = item;
      }),
      
      setDropTarget: (target) => set((state) => {
        state.dropTarget = target;
      }),
      
      // Suggestions & Analysis Actions
      setUltraSmartSuggestions: (suggestions) => set((state) => {
        state.ultraSmartSuggestions = suggestions;
      }),
      
      addRecentReconciliation: (reconciliation) => set((state) => {
        state.recentReconciliations = [reconciliation, ...state.recentReconciliations].slice(0, 50);
      }),
      
      updateClientReliabilityAnalysis: (anagraphicsId, analysis) => set((state) => {
        state.clientReliabilityCache[anagraphicsId] = analysis;
      }),
      
      setOpportunities: (opportunities) => set((state) => {
        state.opportunities = opportunities;
      }),
      
      updatePerformanceMetrics: (metrics) => set((state) => {
        Object.assign(state.performanceMetrics, metrics);
      }),
    })),
    { name: 'ReconciliationStore-V4' }
  )
);

// ===== IMPORT/EXPORT STORE =====
interface ImportExportState {
  // Upload progress
  uploadProgress: Record<string, number>;
  
  // Import history
  importHistory: any[];
  
  // Export queue
  exportQueue: any[];
  
  // Actions
  setUploadProgress: (key: string, progress: number) => void;
  addImportRecord: (record: any) => void;
  addExportRecord: (record: any) => void;
  clearHistory: () => void;
}

export const useImportExportStore = create<ImportExportState>()(
  devtools(
    immer((set, get) => ({
      // Initial State
      uploadProgress: {},
      importHistory: [],
      exportQueue: [],
      
      // Actions
      setUploadProgress: (key, progress) => set((state) => {
        state.uploadProgress[key] = progress;
      }),
      
      addImportRecord: (record) => set((state) => {
        state.importHistory = [record, ...state.importHistory].slice(0, 100);
      }),
      
      addExportRecord: (record) => set((state) => {
        state.exportQueue = [record, ...state.exportQueue].slice(0, 50);
      }),
      
      clearHistory: () => set((state) => {
        state.importHistory = [];
        state.exportQueue = [];
      }),
    })),
    { name: 'ImportExportStore-V4' }
  )
);

// ===== SYNC STORE =====
interface SyncState {
  // Sync status
  syncStatus: {
    enabled: boolean;
    auto_sync_running: boolean;
    last_sync_time: string | null;
    service_available: boolean;
  };
  
  // Sync history
  syncHistory: any[];
  
  // Actions
  updateSyncStatus: (status: Partial<SyncState['syncStatus']>) => void;
  addSyncRecord: (record: any) => void;
}

export const useSyncStore = create<SyncState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial State
        syncStatus: {
          enabled: false,
          auto_sync_running: false,
          last_sync_time: null,
          service_available: false,
        },
        syncHistory: [],
        
        // Actions
        updateSyncStatus: (status) => set((state) => {
          Object.assign(state.syncStatus, status);
        }),
        
        addSyncRecord: (record) => set((state) => {
          state.syncHistory = [record, ...state.syncHistory].slice(0, 100);
        }),
      })),
      {
        name: 'sync-store-v4',
        partialize: (state) => ({
          syncStatus: state.syncStatus,
        }),
      }
    ),
    { name: 'SyncStore-V4' }
  )
);

// ===== UTILITY HOOKS - NO DUPLICATES =====

/**
 * Hook per verificare se le features AI sono abilitate
 */
export const useAIFeaturesEnabled = () => {
  const settings = useUIStore(state => state.settings);
  return settings.ai_features_enabled ?? true;
};

/**
 * Hook per verificare se smart reconciliation è abilitato
 */
export const useSmartReconciliationEnabled = () => {
  const settings = useUIStore(state => state.settings);
  return settings.smart_reconciliation_enabled ?? true;
};

/**
 * Hook per preferenze di cache
 */
export const useCachePreferences = () => {
  const settings = useUIStore(state => state.settings);
  return {
    enabled: true, // Sempre abilitato per performance
    auto_clear: settings.auto_save,
    ttl_minutes: 10,
  };
};

/**
 * Hook per ottenere lo stato di connessione
 */
export const useConnectionStatus = () => {
  return useUIStore(state => state.systemStatus.connection_status);
};

/**
 * Hook per ottenere informazioni di sistema
 */
export const useSystemInfo = () => {
  return useUIStore(state => ({
    version: state.systemStatus.backend_version,
    lastHealthCheck: state.systemStatus.last_health_check,
    connectionStatus: state.systemStatus.connection_status,
  }));
};

/**
 * Hook per gestire le notifiche
 */
export const useNotifications = () => {
  const notifications = useUIStore(state => state.notifications);
  const addNotification = useUIStore(state => state.addNotification);
  const removeNotification = useUIStore(state => state.removeNotification);
  const clearNotifications = useUIStore(state => state.clearNotifications);
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
};

/**
 * Hook per gestire gli stati di loading
 */
export const useLoadingState = (key: string) => {
  const loading = useUIStore(state => state.loadingStates[key] || false);
  const setLoading = useUIStore(state => state.setLoading);
  
  return {
    loading,
    setLoading: (value: boolean) => setLoading(key, value),
  };
};

/**
 * Hook per gestire gli stati di errore
 */
export const useErrorState = (key: string) => {
  const error = useUIStore(state => state.errorStates[key] || null);
  const setError = useUIStore(state => state.setError);
  
  return {
    error,
    setError: (value: string | null) => setError(key, value),
    clearError: () => setError(key, null),
  };
};

/**
 * Funzione per abilitare tutte le features V4.0
 */
export const enableAllV4Features = () => {
  const { updateSettings } = useUIStore.getState();
  updateSettings({
    ai_features_enabled: true,
    smart_reconciliation_enabled: true,
    real_time_updates: true,
  });
  console.log('🚀 All V4.0 features enabled!');
};

// ===== ADDITIONAL UTILITY HOOKS =====

/**
 * Hook per gestire le selezioni bulk nelle riconciliazioni
 */
export const useBulkSelection = () => {
  const selectedInvoices = useReconciliationStore(state => state.selectedInvoices);
  const selectedTransactions = useReconciliationStore(state => state.selectedTransactions);
  const toggleInvoiceSelection = useReconciliationStore(state => state.toggleInvoiceSelection);
  const toggleTransactionSelection = useReconciliationStore(state => state.toggleTransactionSelection);
  const clearSelection = useReconciliationStore(state => state.clearSelection);
  
  return {
    selectedInvoices,
    selectedTransactions,
    toggleInvoiceSelection,
    toggleTransactionSelection,
    clearSelection,
    hasSelections: selectedInvoices.length > 0 || selectedTransactions.length > 0,
    totalSelected: selectedInvoices.length + selectedTransactions.length,
  };
};

/**
 * Hook per gestire drag & drop nelle riconciliazioni
 */
export const useDragDropState = () => {
  const draggedItem = useReconciliationStore(state => state.draggedItem);
  const dropTarget = useReconciliationStore(state => state.dropTarget);
  const setDraggedItem = useReconciliationStore(state => state.setDraggedItem);
  const setDropTarget = useReconciliationStore(state => state.setDropTarget);
  
  return {
    draggedItem,
    dropTarget,
    setDraggedItem,
    setDropTarget,
    isDragging: !!draggedItem,
    canDrop: !!(draggedItem && dropTarget && draggedItem.type !== dropTarget.type),
  };
};

/**
 * Hook per gestire le metriche di performance
 */
export const usePerformanceMetrics = () => {
  const dataMetrics = useDataStore(state => state.performanceMetrics);
  const reconciliationMetrics = useReconciliationStore(state => state.performanceMetrics);
  
  return {
    data: dataMetrics,
    reconciliation: reconciliationMetrics,
    overall: {
      api_health: dataMetrics.api_response_times ? 'good' : 'unknown',
      cache_efficiency: dataMetrics.cache_hit_rates ? 'good' : 'unknown',
      ai_accuracy: reconciliationMetrics.ai_accuracy || 0,
    },
  };
};

/**
 * Hook per gestire i dati recent/quick access
 */
export const useRecentData = () => {
  const recentInvoices = useDataStore(state => state.recentInvoices);
  const recentTransactions = useDataStore(state => state.recentTransactions);
  const recentReconciliations = useReconciliationStore(state => state.recentReconciliations);
  
  return {
    invoices: recentInvoices,
    transactions: recentTransactions,
    reconciliations: recentReconciliations,
    hasRecent: recentInvoices.length > 0 || recentTransactions.length > 0,
  };
};

/**
 * Hook per gestire le statistiche aggregate
 */
export const useAggregatedStats = () => {
  const invoices = useDataStore(state => state.invoices);
  const transactions = useDataStore(state => state.transactions);
  const anagraphics = useDataStore(state => state.anagraphics);
  
  return {
    totals: {
      invoices: invoices.total,
      transactions: transactions.total,
      anagraphics: anagraphics.total,
    },
    lastUpdated: Math.max(
      invoices.lastFetch || 0,
      transactions.lastFetch || 0,
      anagraphics.lastFetch || 0
    ),
    dataFreshness: {
      invoices: invoices.lastFetch ? Date.now() - invoices.lastFetch : null,
      transactions: transactions.lastFetch ? Date.now() - transactions.lastFetch : null,
      anagraphics: anagraphics.lastFetch ? Date.now() - anagraphics.lastFetch : null,
    },
  };
};

/**
 * Hook per gestire il wizard first run
 */
export const useFirstRunWizard = () => {
  const firstRunState = useUIStore(state => state.firstRunState);
  const updateFirstRunState = useUIStore(state => state.updateFirstRunState);
  
  return {
    ...firstRunState,
    updateState: updateFirstRunState,
    isFirstRun: firstRunState.is_first_run,
    isCompleted: firstRunState.setup_completed,
    nextStep: (step: string, data?: Record<string, any>) => {
      updateFirstRunState({
        current_step: step,
        wizard_data: { ...firstRunState.wizard_data, ...data },
      });
    },
    completeWizard: () => {
      updateFirstRunState({
        is_first_run: false,
        setup_completed: true,
        current_step: 'completed',
      });
    },
  };
};

/**
 * Hook per gestire le impostazioni utente
 */
export const useUserSettings = () => {
  const settings = useUIStore(state => state.settings);
  const updateSettings = useUIStore(state => state.updateSettings);
  
  return {
    settings,
    updateSettings,
    isRealTimeEnabled: settings.real_time_updates,
    isCompactMode: settings.compact_mode,
    itemsPerPage: settings.items_per_page,
    language: settings.language,
  };
};

/**
 * Hook per gestire il tema - ALIAS per backward compatibility
 */
export const useTheme = () => {
  const theme = useUIStore(state => state.theme);
  const setTheme = useUIStore(state => state.setTheme);
  
  return { theme, setTheme };
};

// ===== EXPORT STORES - COMMENTED TO AVOID DUPLICATES =====
// Gli store sono già esportati sopra quando vengono creati con create()
// Esportare di nuovo causerebbe duplicati

// export { useUIStore, useDataStore, useReconciliationStore, useImportExportStore, useSyncStore };

// ===== EXPORT TYPES =====
export type {
  UIState,
  DataState,
  ReconciliationState,
  ImportExportState,
  SyncState,
};
