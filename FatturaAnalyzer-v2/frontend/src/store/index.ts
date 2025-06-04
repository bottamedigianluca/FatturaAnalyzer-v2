/**
 * Zustand Store Configuration
 * State management principale per l'applicazione
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

// UI Store - gestisce stato UI globale
interface UIState {
  // Theme e impostazioni
  theme: Theme;
  sidebarCollapsed: boolean;
  
  // Loading states
  loading: LoadingState;
  
  // Error states  
  errors: ErrorState;
  
  // Notifications
  notifications: Notification[];
  
  // Modal states
  modals: {
    [key: string]: boolean;
  };
  
  // Settings
  settings: AppSettings;
  
  // Actions
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
  updateSettings: (settings: Partial<AppSettings>) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
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
          },
          
          // Actions
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
        }))
      ),
      {
        name: 'fattura-analyzer-ui',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          settings: state.settings,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);

// Data Store - gestisce dati di business
interface DataState {
  // Dashboard data
  dashboardData: DashboardData | null;
  dashboardLastUpdated: string | null;
  
  // Cached data
  invoices: {
    data: Invoice[];
    total: number;
    lastFetch: string | null;
  };
  
  transactions: {
    data: BankTransaction[];
    total: number;
    lastFetch: string | null;
  };
  
  anagraphics: {
    data: Anagraphics[];
    total: number;
    lastFetch: string | null;
  };
  
  // Recently viewed items
  recentInvoices: Invoice[];
  recentTransactions: BankTransaction[];
  recentAnagraphics: Anagraphics[];
  
  // Actions
  setDashboardData: (data: DashboardData) => void;
  setInvoices: (data: Invoice[], total: number) => void;
  setTransactions: (data: BankTransaction[], total: number) => void;
  setAnagraphics: (data: Anagraphics[], total: number) => void;
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
}

export const useDataStore = create<DataState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        dashboardData: null,
        dashboardLastUpdated: null,
        invoices: {
          data: [],
          total: 0,
          lastFetch: null,
        },
        transactions: {
          data: [],
          total: 0,
          lastFetch: null,
        },
        anagraphics: {
          data: [],
          total: 0,
          lastFetch: null,
        },
        recentInvoices: [],
        recentTransactions: [],
        recentAnagraphics: [],
        
        // Actions
        setDashboardData: (data) => set((state) => {
          state.dashboardData = data;
          state.dashboardLastUpdated = new Date().toISOString();
        }),
        
        setInvoices: (data, total) => set((state) => {
          state.invoices.data = data;
          state.invoices.total = total;
          state.invoices.lastFetch = new Date().toISOString();
        }),
        
        setTransactions: (data, total) => set((state) => {
          state.transactions.data = data;
          state.transactions.total = total;
          state.transactions.lastFetch = new Date().toISOString();
        }),
        
        setAnagraphics: (data, total) => set((state) => {
          state.anagraphics.data = data;
          state.anagraphics.total = total;
          state.anagraphics.lastFetch = new Date().toISOString();
        }),
        
        addRecentInvoice: (invoice) => set((state) => {
          // Remove if already exists
          state.recentInvoices = state.recentInvoices.filter(i => i.id !== invoice.id);
          // Add to beginning
          state.recentInvoices.unshift(invoice);
          // Keep only 10 recent items
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
          
          if (state.dashboardData?.recent_transactions) {
            state.dashboardData.recent_transactions = state.dashboardData.recent_transactions.filter(t => t.id !== id);
          }
        }),
        
        removeAnagraphics: (id) => set((state) => {
          state.anagraphics.data = state.anagraphics.data.filter(a => a.id !== id);
          state.anagraphics.total = Math.max(0, state.anagraphics.total - 1);
          state.recentAnagraphics = state.recentAnagraphics.filter(a => a.id !== id);
        }),
        
        clearCache: () => set((state) => {
          state.invoices = { data: [], total: 0, lastFetch: null };
          state.transactions = { data: [], total: 0, lastFetch: null };
          state.anagraphics = { data: [], total: 0, lastFetch: null };
          state.dashboardData = null;
          state.dashboardLastUpdated = null;
        }),
      }))
    ),
    { name: 'DataStore' }
  )
);

// Reconciliation Store - gestisce stato riconciliazione
interface ReconciliationState {
  // Current reconciliation session
  selectedInvoices: Invoice[];
  selectedTransactions: BankTransaction[];
  suggestions: any[];
  opportunities: any[];
  
  // Drag & drop state
  draggedItem: { type: 'invoice' | 'transaction'; data: Invoice | BankTransaction } | null;
  dropTarget: { type: 'invoice' | 'transaction'; id: number } | null;
  
  // Reconciliation history
  recentReconciliations: any[];
  
  // Actions
  addSelectedInvoice: (invoice: Invoice) => void;
  removeSelectedInvoice: (id: number) => void;
  addSelectedTransaction: (transaction: BankTransaction) => void;
  removeSelectedTransaction: (id: number) => void;
  clearSelection: () => void;
  setSuggestions: (suggestions: any[]) => void;
  setOpportunities: (opportunities: any[]) => void;
  setDraggedItem: (item: { type: 'invoice' | 'transaction'; data: Invoice | BankTransaction } | null) => void;
  setDropTarget: (target: { type: 'invoice' | 'transaction'; id: number } | null) => void;
  addRecentReconciliation: (reconciliation: any) => void;
  clearReconciliationState: () => void;
}

export const useReconciliationStore = create<ReconciliationState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      selectedInvoices: [],
      selectedTransactions: [],
      suggestions: [],
      opportunities: [],
      draggedItem: null,
      dropTarget: null,
      recentReconciliations: [],
      
      // Actions
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
        state.recentReconciliations.unshift(reconciliation);
        state.recentReconciliations = state.recentReconciliations.slice(0, 20);
      }),
      
      clearReconciliationState: () => set((state) => {
        state.selectedInvoices = [];
        state.selectedTransactions = [];
        state.draggedItem = null;
        state.dropTarget = null;
        state.suggestions = [];
        state.opportunities = [];
      }),
    })),
    { name: 'ReconciliationStore' }
  )
);

// Export stores and selectors
export { useUIStore, useDataStore, useReconciliationStore };

// Utility selectors
export const useTheme = () => useUIStore(state => state.theme);
export const useLoading = (key?: string) => useUIStore(state => 
  key ? state.loading[key] || false : Object.keys(state.loading).length > 0
);
export const useError = (key?: string) => useUIStore(state => 
  key ? state.errors[key] || null : Object.values(state.errors).filter(Boolean)[0] || null
);
export const useNotifications = () => useUIStore(state => state.notifications);
export const useSettings = () => useUIStore(state => state.settings);

// Data selectors
export const useDashboardData = () => useDataStore(state => state.dashboardData);
export const useInvoicesCache = () => useDataStore(state => state.invoices);
export const useTransactionsCache = () => useDataStore(state => state.transactions);
export const useAnagraphicsCache = () => useDataStore(state => state.anagraphics);
export const useRecentItems = () => useDataStore(state => ({
  invoices: state.recentInvoices,
  transactions: state.recentTransactions,
  anagraphics: state.recentAnagraphics,
}));

// Reconciliation selectors
export const useReconciliationSelection = () => useReconciliationStore(state => ({
  invoices: state.selectedInvoices,
  transactions: state.selectedTransactions,
}));
export const useReconciliationSuggestions = () => useReconciliationStore(state => state.suggestions);
export const useReconciliationOpportunities = () => useReconciliationStore(state => state.opportunities);
export const useDragAndDrop = () => useReconciliationStore(state => ({
  draggedItem: state.draggedItem,
  dropTarget: state.dropTarget,
}));