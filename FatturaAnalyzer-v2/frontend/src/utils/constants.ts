/**
 * Application constants for FatturaAnalyzer
 * Costanti utilizzate attraverso l'applicazione
 */

// API e configurazione
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Limiti applicazione
export const APP_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BATCH_SIZE: 100,
  MAX_SEARCH_RESULTS: 50,
  MAX_RECENT_ITEMS: 10,
  MAX_NOTIFICATION_DURATION: 30000,
  MIN_SEARCH_QUERY_LENGTH: 2,
} as const;

// Formati file supportati
export const SUPPORTED_FILE_FORMATS = {
  INVOICES: {
    XML: ['.xml'],
    P7M: ['.p7m'],
    EXCEL: ['.xlsx', '.xls'],
    PDF: ['.pdf'],
  },
  TRANSACTIONS: {
    CSV: ['.csv'],
    EXCEL: ['.xlsx', '.xls'],
    TXT: ['.txt'],
  },
  EXPORTS: {
    EXCEL: '.xlsx',
    CSV: '.csv',
    PDF: '.pdf',
    JSON: '.json',
  },
} as const;

// MIME types
export const MIME_TYPES = {
  XML: 'text/xml',
  P7M: 'application/pkcs7-mime',
  CSV: 'text/csv',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  EXCEL_LEGACY: 'application/vnd.ms-excel',
  PDF: 'application/pdf',
  JSON: 'application/json',
} as const;

// Stati business
export const PAYMENT_STATUSES = [
  'Aperta',
  'Scaduta', 
  'Pagata Parz.',
  'Pagata Tot.',
  'Insoluta',
  'Riconciliata'
] as const;

export const RECONCILIATION_STATUSES = [
  'Da Riconciliare',
  'Riconciliato Parz.',
  'Riconciliato Tot.',
  'Riconciliato Eccesso',
  'Ignorato'
] as const;

export const INVOICE_TYPES = [
  'Attiva',
  'Passiva'
] as const;

export const ANAGRAPHICS_TYPES = [
  'Cliente',
  'Fornitore'
] as const;

// Opzioni di paginazione
export const PAGINATION_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;

// Intervalli di refresh
export const REFRESH_INTERVALS = {
  DASHBOARD: 5 * 60 * 1000, // 5 minuti
  RECONCILIATION: 2 * 60 * 1000, // 2 minuti
  REAL_TIME: 30 * 1000, // 30 secondi
  ANALYTICS: 10 * 60 * 1000, // 10 minuti
} as const;

// Formati data
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_TIME: 'dd/MM/yyyy HH:mm',
  API: 'yyyy-MM-dd',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'',
  FILENAME: 'yyyyMMdd_HHmmss',
} as const;

// Valute supportate
export const CURRENCIES = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dollaro USA',
    decimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'Sterlina',
    decimals: 2,
  },
} as const;

// Località supportate
export const LOCALES = {
  IT: {
    code: 'it-IT',
    name: 'Italiano',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: '1.234,56',
  },
  EN: {
    code: 'en-US',
    name: 'English',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: '1,234.56',
  },
} as const;

// Temi disponibili
export const THEMES = ['light', 'dark', 'system'] as const;

// Colori per grafici
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  SECONDARY: '#6b7280',
  PALETTE: [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
    '#ec4899', // pink
    '#6b7280', // gray
  ],
} as const;

// Configurazione tabelle
export const TABLE_CONFIG = {
  DEFAULT_SORT: 'created_at',
  DEFAULT_ORDER: 'desc',
  STICKY_HEADER: true,
  SHOW_PAGINATION: true,
  SHOW_PAGE_SIZE_SELECT: true,
} as const;

// Validazione
export const VALIDATION_RULES = {
  CODICE_FISCALE_LENGTH: 16,
  PARTITA_IVA_LENGTH: 11,
  CAP_LENGTH: 5,
  IBAN_MIN_LENGTH: 15,
  IBAN_MAX_LENGTH: 34,
  PASSWORD_MIN_LENGTH: 8,
  EMAIL_MAX_LENGTH: 254,
  PHONE_LENGTH: 10,
  DOCUMENT_NUMBER_MAX_LENGTH: 50,
  DENOMINATION_MAX_LENGTH: 255,
} as const;

// Messaggi di errore comuni
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Errore di connessione. Verificare la connessione internet.',
  SERVER_ERROR: 'Errore interno del server. Riprovare più tardi.',
  VALIDATION_ERROR: 'Dati non validi. Verificare i campi evidenziati.',
  NOT_FOUND: 'Risorsa non trovata.',
  UNAUTHORIZED: 'Accesso non autorizzato.',
  FORBIDDEN: 'Operazione non consentita.',
  TIMEOUT: 'Timeout della richiesta.',
  FILE_TOO_LARGE: 'File troppo grande.',
  UNSUPPORTED_FORMAT: 'Formato file non supportato.',
  DUPLICATE_ENTRY: 'Elemento già esistente.',
} as const;

// Messaggi di successo
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Salvataggio completato con successo.',
  DELETE_SUCCESS: 'Eliminazione completata con successo.',
  IMPORT_SUCCESS: 'Importazione completata con successo.',
  EXPORT_SUCCESS: 'Esportazione completata con successo.',
  RECONCILIATION_SUCCESS: 'Riconciliazione completata con successo.',
  SYNC_SUCCESS: 'Sincronizzazione completata con successo.',
} as const;

// Routes dell'applicazione
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  INVOICES: '/invoices',
  INVOICE_DETAIL: '/invoices/:id',
  TRANSACTIONS: '/transactions',
  TRANSACTION_DETAIL: '/transactions/:id',
  RECONCILIATION: '/reconciliation',
  ANAGRAPHICS: '/anagraphics',
  ANAGRAPHICS_DETAIL: '/anagraphics/:id',
  ANALYTICS: '/analytics',
  IMPORT_EXPORT: '/import',
  SETTINGS: '/settings',
} as const;

// Query keys per React Query
export const QUERY_KEYS = {
  DASHBOARD: ['dashboard'],
  INVOICES: ['invoices'],
  INVOICE: ['invoice'],
  TRANSACTIONS: ['transactions'],
  TRANSACTION: ['transaction'],
  ANAGRAPHICS: ['anagraphics'],
  ANAGRAPHICS_ITEM: ['anagraphics-item'],
  RECONCILIATION_SUGGESTIONS: ['reconciliation-suggestions'],
  RECONCILIATION_OPPORTUNITIES: ['reconciliation-opportunities'],
  ANALYTICS: ['analytics'],
  KPI: ['kpi'],
  SEARCH: ['search'],
} as const;

// Local Storage keys
export const STORAGE_KEYS = {
  THEME: 'fattura-analyzer-theme',
  SIDEBAR_COLLAPSED: 'fattura-analyzer-sidebar-collapsed',
  USER_PREFERENCES: 'fattura-analyzer-preferences',
  TABLE_SETTINGS: 'fattura-analyzer-table-settings',
  RECENT_SEARCHES: 'fattura-analyzer-recent-searches',
} as const;

// Configurazione riconciliazione
export const RECONCILIATION_CONFIG = {
  DEFAULT_CONFIDENCE_THRESHOLD: 0.7,
  HIGH_CONFIDENCE_THRESHOLD: 0.9,
  LOW_CONFIDENCE_THRESHOLD: 0.5,
  MAX_SUGGESTIONS: 50,
  AUTO_RECONCILE_THRESHOLD: 0.95,
  AMOUNT_TOLERANCE: 0.01,
} as const;

// Configurazione analytics
export const ANALYTICS_CONFIG = {
  DEFAULT_PERIOD_MONTHS: 12,
  MAX_PERIOD_MONTHS: 60,
  CHART_HEIGHT: 400,
  MOBILE_CHART_HEIGHT: 250,
  KPI_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minuti
} as const;

// Configurazione notifiche
export const NOTIFICATION_CONFIG = {
  DEFAULT_DURATION: 5000,
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 8000,
  WARNING_DURATION: 6000,
  MAX_NOTIFICATIONS: 5,
  POSITION: 'top-right',
} as const;

// Regex patterns
export const REGEX_PATTERNS = {
  CODICE_FISCALE: /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/,
  PARTITA_IVA: /^[0-9]{11}$/,
  CAP: /^[0-9]{5}$/,
  IBAN: /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_IT: /^[0-9]{10}$/,
  PHONE_IT_INTERNATIONAL: /^39[0-9]{10}$/,
} as const;

// Configurazione import/export
export const IMPORT_EXPORT_CONFIG = {
  BATCH_SIZE: 50,
  MAX_CONCURRENT_REQUESTS: 3,
  PROGRESS_UPDATE_INTERVAL: 100,
  CSV_DELIMITER: ',',
  CSV_ENCODING: 'UTF-8',
  EXCEL_SHEET_NAME: 'Dati',
} as const;

// Configurazione sicurezza
export const SECURITY_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minuti
  AUTO_LOGOUT_WARNING: 5 * 60 * 1000, // 5 minuti prima
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minuti
} as const;

// Status dell'applicazione
export const APP_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  OFFLINE: 'offline',
} as const;

// Priorità delle operazioni
export const OPERATION_PRIORITY = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;

// Tipi di log
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;
