/**
 * Application Constants V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Costanti completamente aggiornate per supportare:
 * - Analytics V3.0 Ultra-Optimized con AI/ML
 * - Reconciliation V4.0 Smart Features
 * - Transactions V4.0 Enhanced
 * - First Run Wizard completo
 * - Import/Export avanzato
 * - Cloud Sync intelligente
 */

// ===== API & CONFIGURATION V4.0 =====
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  VERSION: 'V4.0',
  TIMEOUT: 45000, // Aumentato per operazioni AI complesse
  RETRY_ATTEMPTS: 5, // Più resiliente
  RETRY_DELAY: 1500,
  RETRY_BACKOFF_FACTOR: 2,
  MAX_CONCURRENT_REQUESTS: 6, // Ottimizzato per V4.0
  REQUEST_BATCH_SIZE: 25,
  
  // Endpoints V4.0
  ENDPOINTS: {
    HEALTH: '/health',
    FIRST_RUN: '/api/first-run',
    SETUP: '/api/setup',
    ANAGRAPHICS: '/api/anagraphics',
    INVOICES: '/api/invoices',
    TRANSACTIONS: '/api/transactions',
    RECONCILIATION: '/api/reconciliation',
    ANALYTICS: '/api/analytics',
    IMPORT_EXPORT: '/api/import-export',
    SYNC: '/api/sync',
    
    // V4.0 Specific
    AI_INSIGHTS: '/api/analytics/ai',
    SMART_RECONCILIATION: '/api/reconciliation/ultra',
    TRANSACTION_INSIGHTS: '/api/transactions/insights',
    BATCH_OPERATIONS: '/api/transactions/batch',
    REAL_TIME_METRICS: '/api/analytics/realtime',
  }
} as const;

// ===== V4.0 FEATURES & CAPABILITIES =====
export const V4_FEATURES = {
  // AI & Machine Learning
  AI_BUSINESS_INSIGHTS: true,
  PREDICTIVE_ANALYTICS: true,
  PATTERN_RECOGNITION: true,
  AUTOMATED_LEARNING: true,
  CONFIDENCE_SCORING: true,
  
  // Smart Reconciliation
  ULTRA_SMART_MATCHING: true,
  AI_ENHANCED_SUGGESTIONS: true,
  CLIENT_RELIABILITY_ANALYSIS: true,
  AUTOMATIC_RECONCILIATION: true,
  PARALLEL_PROCESSING: true,
  
  // Enhanced Transactions
  REAL_TIME_INSIGHTS: true,
  SMART_CATEGORIZATION: true,
  FRAUD_DETECTION: true,
  BATCH_OPERATIONS_V4: true,
  ENHANCED_SEARCH: true,
  
  // Advanced Analytics
  EXECUTIVE_DASHBOARD_ULTRA: true,
  OPERATIONS_DASHBOARD_LIVE: true,
  CUSTOM_AI_ANALYSIS: true,
  SEASONALITY_ANALYSIS: true,
  COMPETITIVE_ANALYSIS: true,
  
  // System Features
  INTELLIGENT_CACHING: true,
  PERFORMANCE_MONITORING: true,
  AUTO_OPTIMIZATION: true,
  CLOUD_SYNC_V4: true,
  ADVANCED_IMPORT_EXPORT: true,
} as const;

// ===== APPLICATION LIMITS V4.0 =====
export const APP_LIMITS = {
  // File handling
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB per V4.0
  MAX_BATCH_SIZE: 500, // Aumentato per V4.0
  MAX_CONCURRENT_UPLOADS: 5,
  MAX_IMPORT_QUEUE_SIZE: 10,
  
  // Data limits
  MAX_SEARCH_RESULTS: 200, // Migliorato con V4.0
  MAX_RECENT_ITEMS: 50,
  MAX_SMART_SUGGESTIONS: 100,
  MAX_AI_INSIGHTS_PER_REQUEST: 25,
  MAX_RECONCILIATION_COMBINATIONS: 1000,
  
  // UI & UX
  MAX_NOTIFICATION_DURATION: 45000,
  MIN_SEARCH_QUERY_LENGTH: 1, // Migliorato con AI
  MAX_SIMULTANEOUS_NOTIFICATIONS: 8,
  MAX_DASHBOARD_WIDGETS: 20,
  
  // Performance
  MAX_CACHE_SIZE_MB: 100,
  MAX_CACHED_QUERIES: 500,
  MAX_REAL_TIME_CONNECTIONS: 10,
  API_RATE_LIMIT_PER_MINUTE: 1000,
  
  // Analytics
  MAX_ANALYTICS_TIMEFRAME_YEARS: 10,
  MAX_CUSTOM_REPORTS: 50,
  MAX_KPI_DASHBOARD_ITEMS: 15,
  MAX_CHART_DATA_POINTS: 1000,
} as const;

// ===== SUPPORTED FILE FORMATS V4.0 =====
export const SUPPORTED_FILE_FORMATS = {
  INVOICES: {
    XML: ['.xml', '.XML'],
    P7M: ['.p7m', '.P7M'],
    EXCEL: ['.xlsx', '.xls', '.XLSX', '.XLS'],
    PDF: ['.pdf', '.PDF'],
    JSON: ['.json', '.JSON'], // Nuovo in V4.0
    CSV: ['.csv', '.CSV'], // Aggiunto per V4.0
  },
  TRANSACTIONS: {
    CSV: ['.csv', '.CSV'],
    EXCEL: ['.xlsx', '.xls', '.XLSX', '.XLS'],
    TXT: ['.txt', '.TXT'],
    QIF: ['.qif', '.QIF'], // Nuovo in V4.0
    OFX: ['.ofx', '.OFX'], // Nuovo in V4.0
    JSON: ['.json', '.JSON'], // Nuovo in V4.0
  },
  ANAGRAPHICS: {
    CSV: ['.csv', '.CSV'],
    EXCEL: ['.xlsx', '.xls'],
    VCARD: ['.vcf', '.VCF'], // Nuovo in V4.0
    JSON: ['.json', '.JSON'],
  },
  EXPORTS: {
    EXCEL: '.xlsx',
    CSV: '.csv',
    PDF: '.pdf',
    JSON: '.json',
    XML: '.xml', // Nuovo in V4.0
    ZIP: '.zip', // Per esportazioni multiple
  },
  BACKUP: {
    ZIP: '.zip',
    SQL: '.sql',
    JSON: '.json',
  }
} as const;

// ===== ENHANCED MIME TYPES V4.0 =====
export const MIME_TYPES = {
  // Documenti
  XML: 'text/xml',
  P7M: 'application/pkcs7-mime',
  CSV: 'text/csv',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  EXCEL_LEGACY: 'application/vnd.ms-excel',
  PDF: 'application/pdf',
  JSON: 'application/json',
  
  // Nuovi formati V4.0
  QIF: 'application/x-qif',
  OFX: 'application/x-ofx',
  VCARD: 'text/vcard',
  ZIP: 'application/zip',
  SQL: 'application/sql',
  
  // Immagini (per future funzionalità)
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  SVG: 'image/svg+xml',
} as const;

// ===== BUSINESS STATUSES V4.0 =====
export const PAYMENT_STATUSES = [
  'Aperta',
  'Scaduta', 
  'Pagata Parz.',
  'Pagata Tot.',
  'Insoluta',
  'Riconciliata',
  'In Contestazione', // Nuovo V4.0
  'Rateizzata', // Nuovo V4.0
  'Stornata', // Nuovo V4.0
] as const;

export const RECONCILIATION_STATUSES = [
  'Da Riconciliare',
  'Riconciliato Parz.',
  'Riconciliato Tot.',
  'Riconciliato Eccesso',
  'Ignorato',
  'AI Suggerito', // Nuovo V4.0
  'Auto Riconciliato', // Nuovo V4.0
  'In Revisione', // Nuovo V4.0
] as const;

export const INVOICE_TYPES = [
  'Attiva',
  'Passiva',
  'Nota Credito Attiva', // Nuovo V4.0
  'Nota Credito Passiva', // Nuovo V4.0
  'Autofattura', // Nuovo V4.0
  'Reverse Charge', // Nuovo V4.0
] as const;

export const ANAGRAPHICS_TYPES = [
  'Cliente',
  'Fornitore',
  'Cliente/Fornitore', // Nuovo V4.0
  'Professionista', // Nuovo V4.0
  'Ente Pubblico', // Nuovo V4.0
  'Banca', // Nuovo V4.0
] as const;

// ===== V4.0 AI & SMART FEATURES =====
export const AI_CONFIDENCE_LEVELS = {
  VERY_HIGH: { min: 0.95, label: 'Molto Alta', color: '#10b981' },
  HIGH: { min: 0.85, label: 'Alta', color: '#3b82f6' },
  MEDIUM: { min: 0.70, label: 'Media', color: '#f59e0b' },
  LOW: { min: 0.50, label: 'Bassa', color: '#ef4444' },
  VERY_LOW: { min: 0.0, label: 'Molto Bassa', color: '#6b7280' },
} as const;

export const SMART_RECONCILIATION_MODES = [
  '1_to_1', // Una fattura - una transazione
  'n_to_m', // Più fatture - più transazioni
  'smart_client', // Basato su cliente
  'auto', // Automatico
  'ultra_smart', // AI avanzata V4.0
] as const;

export const AI_ANALYSIS_DEPTHS = [
  'quick', // Analisi veloce
  'standard', // Analisi standard
  'deep', // Analisi approfondita
  'comprehensive', // Analisi completa
] as const;

// ===== PAGINATION & PERFORMANCE V4.0 =====
export const PAGINATION_OPTIONS = [10, 25, 50, 100, 200, 500] as const;
export const DEFAULT_PAGE_SIZE = 50;
export const INFINITE_SCROLL_PAGE_SIZE = 25;
export const SEARCH_RESULTS_PAGE_SIZE = 20;

// ===== REFRESH INTERVALS V4.0 =====
export const REFRESH_INTERVALS = {
  // Dashboard
  EXECUTIVE_DASHBOARD: 5 * 60 * 1000, // 5 minuti
  OPERATIONS_DASHBOARD: 2 * 60 * 1000, // 2 minuti
  REAL_TIME_METRICS: 10 * 1000, // 10 secondi
  
  // Data
  INVOICES_CACHE: 10 * 60 * 1000, // 10 minuti
  TRANSACTIONS_CACHE: 5 * 60 * 1000, // 5 minuti
  ANAGRAPHICS_CACHE: 30 * 60 * 1000, // 30 minuti
  
  // AI & Smart Features
  AI_INSIGHTS: 15 * 60 * 1000, // 15 minuti
  SMART_SUGGESTIONS: 2 * 60 * 1000, // 2 minuti
  CLIENT_RELIABILITY: 60 * 60 * 1000, // 1 ora
  
  // System
  HEALTH_CHECK: 60 * 1000, // 1 minuto
  PERFORMANCE_METRICS: 5 * 60 * 1000, // 5 minuti
  SYNC_STATUS: 30 * 1000, // 30 secondi
  
  // Analytics
  ANALYTICS_CACHE: 10 * 60 * 1000, // 10 minuti
  KPI_REFRESH: 5 * 60 * 1000, // 5 minuti
  CUSTOM_REPORTS: 15 * 60 * 1000, // 15 minuti
} as const;

// ===== DATE FORMATS V4.0 =====
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_TIME: 'dd/MM/yyyy HH:mm',
  DISPLAY_FULL: 'dd/MM/yyyy HH:mm:ss',
  API: 'yyyy-MM-dd',
  API_TIME: 'yyyy-MM-dd HH:mm:ss',
  ISO: 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'',
  FILENAME: 'yyyyMMdd_HHmmss',
  MONTH_YEAR: 'MM/yyyy',
  QUARTER: 'Q[Q] yyyy',
  RELATIVE: 'relative', // Per date relative (es. "2 ore fa")
} as const;

// ===== CURRENCIES V4.0 =====
export const CURRENCIES = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    position: 'after', // Posizione del simbolo
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dollaro USA',
    decimals: 2,
    position: 'before',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'Sterlina',
    decimals: 2,
    position: 'before',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Franco Svizzero',
    decimals: 2,
    position: 'after',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Yen Giapponese',
    decimals: 0,
    position: 'before',
  },
} as const;

// ===== LOCALES V4.0 =====
export const LOCALES = {
  IT: {
    code: 'it-IT',
    name: 'Italiano',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: '1.234,56',
    currency: 'EUR',
    rtl: false,
  },
  EN: {
    code: 'en-US',
    name: 'English',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: '1,234.56',
    currency: 'USD',
    rtl: false,
  },
  DE: {
    code: 'de-DE',
    name: 'Deutsch',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: '1.234,56',
    currency: 'EUR',
    rtl: false,
  },
  FR: {
    code: 'fr-FR',
    name: 'Français',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: '1 234,56',
    currency: 'EUR',
    rtl: false,
  },
} as const;

// ===== THEMES V4.0 =====
export const THEMES = ['light', 'dark', 'system', 'auto'] as const;

export const THEME_COLORS = {
  light: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1f2937',
  },
  dark: {
    primary: '#60a5fa',
    secondary: '#9ca3af',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    info: '#22d3ee',
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
  },
} as const;

// ===== CHART COLORS V4.0 =====
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  SECONDARY: '#6b7280',
  
  // Palette estesa V4.0
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
    '#14b8a6', // teal
    '#f43f5e', // rose
    '#a855f7', // violet
    '#06b6d4', // sky
    '#65a30d', // green-600
  ],
  
  // Palette per AI insights
  AI_PALETTE: [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f43f5e', // rose
  ],
  
  // Colori per confidence levels
  CONFIDENCE_COLORS: {
    VERY_HIGH: '#10b981',
    HIGH: '#3b82f6',
    MEDIUM: '#f59e0b',
    LOW: '#ef4444',
    VERY_LOW: '#6b7280',
  },
} as const;

// ===== TABLE CONFIGURATION V4.0 =====
export const TABLE_CONFIG = {
  DEFAULT_SORT: 'created_at',
  DEFAULT_ORDER: 'desc',
  STICKY_HEADER: true,
  SHOW_PAGINATION: true,
  SHOW_PAGE_SIZE_SELECT: true,
  SHOW_COLUMN_SELECTOR: true, // Nuovo V4.0
  SHOW_EXPORT_BUTTON: true, // Nuovo V4.0
  SHOW_FILTERS: true, // Nuovo V4.0
  VIRTUAL_SCROLLING: true, // Nuovo V4.0
  ROW_SELECTION: true, // Nuovo V4.0
  RESIZABLE_COLUMNS: true, // Nuovo V4.0
  SORTABLE_COLUMNS: true,
  FILTERABLE_COLUMNS: true,
  
  // Configurazioni avanzate V4.0
  MAX_VISIBLE_ROWS: 1000,
  ROW_HEIGHT: 48,
  HEADER_HEIGHT: 56,
  FOOTER_HEIGHT: 64,
} as const;

// ===== VALIDATION RULES V4.0 =====
export const VALIDATION_RULES = {
  // Codici fiscali italiani
  CODICE_FISCALE_LENGTH: 16,
  PARTITA_IVA_LENGTH: 11,
  CAP_LENGTH: 5,
  
  // IBAN internazionali
  IBAN_MIN_LENGTH: 15,
  IBAN_MAX_LENGTH: 34,
  IBAN_IT_LENGTH: 27,
  
  // Sicurezza
  PASSWORD_MIN_LENGTH: 12, // Aumentato per V4.0
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_SPECIAL: true,
  PASSWORD_REQUIRE_NUMBERS: true,
  PASSWORD_REQUIRE_UPPERCASE: true,
  
  // Contatti
  EMAIL_MAX_LENGTH: 254,
  PHONE_MIN_LENGTH: 8,
  PHONE_MAX_LENGTH: 15,
  
  // Business
  DOCUMENT_NUMBER_MAX_LENGTH: 100, // Aumentato
  DENOMINATION_MAX_LENGTH: 500, // Aumentato
  DESCRIPTION_MAX_LENGTH: 1000,
  NOTES_MAX_LENGTH: 5000,
  
  // Importi
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 999999999.99,
  AMOUNT_DECIMALS: 2,
  
  // Date
  DATE_MIN_YEAR: 1900,
  DATE_MAX_YEAR: 2100,
  
  // File
  FILENAME_MAX_LENGTH: 255,
  PATH_MAX_LENGTH: 1000,
} as const;

// ===== ERROR MESSAGES V4.0 =====
export const ERROR_MESSAGES = {
  // Network & Connection
  NETWORK_ERROR: 'Errore di connessione. Verificare la connessione internet.',
  SERVER_ERROR: 'Errore interno del server. Riprovare più tardi.',
  TIMEOUT: 'Timeout della richiesta. Il server sta impiegando troppo tempo a rispondere.',
  BACKEND_UNREACHABLE: 'Backend V4.0 non raggiungibile. Verificare che sia in esecuzione.',
  
  // Authentication & Authorization
  UNAUTHORIZED: 'Accesso non autorizzato. Effettuare nuovamente il login.',
  FORBIDDEN: 'Operazione non consentita. Verificare i permessi.',
  SESSION_EXPIRED: 'Sessione scaduta. Effettuare nuovamente il login.',
  
  // Validation
  VALIDATION_ERROR: 'Dati non validi. Verificare i campi evidenziati.',
  REQUIRED_FIELD: 'Campo obbligatorio.',
  INVALID_FORMAT: 'Formato non valido.',
  INVALID_EMAIL: 'Indirizzo email non valido.',
  INVALID_PHONE: 'Numero di telefono non valido.',
  INVALID_DATE: 'Data non valida.',
  INVALID_AMOUNT: 'Importo non valido.',
  
  // Resources
  NOT_FOUND: 'Risorsa non trovata.',
  ALREADY_EXISTS: 'Elemento già esistente.',
  DUPLICATE_ENTRY: 'Voce duplicata. L\'elemento esiste già.',
  REFERENCE_ERROR: 'Impossibile eliminare: elemento riferito da altri dati.',
  
  // Files
  FILE_TOO_LARGE: 'File troppo grande. Dimensione massima consentita: {maxSize}MB.',
  UNSUPPORTED_FORMAT: 'Formato file non supportato. Formati consentiti: {formats}.',
  FILE_CORRUPTED: 'File corrotto o non leggibile.',
  FILE_EMPTY: 'File vuoto.',
  
  // Business Logic
  AMOUNT_MISMATCH: 'Importi non corrispondenti.',
  DATE_RANGE_INVALID: 'Intervallo di date non valido.',
  RECONCILIATION_ERROR: 'Errore durante la riconciliazione.',
  IMPORT_ERROR: 'Errore durante l\'importazione.',
  EXPORT_ERROR: 'Errore durante l\'esportazione.',
  
  // AI & Smart Features V4.0
  AI_SERVICE_UNAVAILABLE: 'Servizio AI temporaneamente non disponibile.',
  SMART_SUGGESTIONS_ERROR: 'Errore nel caricamento dei suggerimenti intelligenti.',
  CONFIDENCE_TOO_LOW: 'Livello di confidenza troppo basso per l\'operazione automatica.',
  PATTERN_ANALYSIS_FAILED: 'Analisi dei pattern fallita.',
  
  // System
  CACHE_ERROR: 'Errore nel sistema di cache.',
  DATABASE_ERROR: 'Errore nel database.',
  SYNC_ERROR: 'Errore di sincronizzazione.',
  BACKUP_ERROR: 'Errore nella creazione del backup.',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Troppe richieste. Riprovare tra qualche minuto.',
  QUOTA_EXCEEDED: 'Quota di utilizzo superata.',
} as const;

// ===== SUCCESS MESSAGES V4.0 =====
export const SUCCESS_MESSAGES = {
  // CRUD Operations
  SAVE_SUCCESS: 'Salvataggio completato con successo.',
  CREATE_SUCCESS: 'Elemento creato con successo.',
  UPDATE_SUCCESS: 'Aggiornamento completato con successo.',
  DELETE_SUCCESS: 'Eliminazione completata con successo.',
  
  // Import/Export
  IMPORT_SUCCESS: 'Importazione completata: {imported}/{total} elementi elaborati.',
  EXPORT_SUCCESS: 'Esportazione completata con successo.',
  BACKUP_SUCCESS: 'Backup creato e scaricato con successo.',
  
  // Reconciliation
  RECONCILIATION_SUCCESS: 'Riconciliazione completata con successo.',
  BATCH_RECONCILIATION_SUCCESS: 'Riconciliazione batch completata: {count} operazioni elaborate.',
  AUTO_RECONCILIATION_SUCCESS: 'Riconciliazione automatica completata con alta confidenza.',
  
  // Sync
  SYNC_SUCCESS: 'Sincronizzazione completata con successo.',
  SYNC_ENABLED: 'Sincronizzazione con Google Drive attivata.',
  SYNC_DISABLED: 'Sincronizzazione disattivata.',
  
  // AI & Smart Features V4.0
  AI_ANALYSIS_SUCCESS: 'Analisi AI completata con successo.',
  SMART_SUGGESTIONS_LOADED: 'Suggerimenti intelligenti caricati.',
  PATTERN_LEARNING_SUCCESS: 'Pattern appreso e salvato nel sistema.',
  CONFIDENCE_HIGH: 'Operazione completata con alta confidenza AI.',
  
  // System
  CACHE_CLEARED: 'Cache pulita con successo.',
  SYSTEM_HEALTHY: 'Tutti i sistemi funzionano correttamente.',
  PERFORMANCE_OPTIMIZED: 'Prestazioni del sistema ottimizzate.',
  
  // Settings
  SETTINGS_SAVED: 'Impostazioni salvate con successo.',
  PREFERENCES_UPDATED: 'Preferenze aggiornate.',
  THEME_CHANGED: 'Tema applicazione cambiato.',
} as const;

// ===== ROUTES V4.0 =====
export const ROUTES = {
  // Core
  HOME: '/',
  DASHBOARD: '/dashboard',
  
  // Data Management
  INVOICES: '/invoices',
  INVOICE_DETAIL: '/invoices/:id',
  INVOICE_CREATE: '/invoices/new',
  TRANSACTIONS: '/transactions',
  TRANSACTION_DETAIL: '/transactions/:id',
  ANAGRAPHICS: '/anagraphics',
  ANAGRAPHICS_DETAIL: '/anagraphics/:id',
  ANAGRAPHICS_CREATE: '/anagraphics/new',
  
  // Reconciliation V4.0
  RECONCILIATION: '/reconciliation',
  RECONCILIATION_SMART: '/reconciliation/smart',
  RECONCILIATION_BATCH: '/reconciliation/batch',
  RECONCILIATION_HISTORY: '/reconciliation/history',
  
  // Analytics V3.0
  ANALYTICS: '/analytics',
  ANALYTICS_EXECUTIVE: '/analytics/executive',
  ANALYTICS_OPERATIONS: '/analytics/operations',
  ANALYTICS_AI: '/analytics/ai-insights',
  ANALYTICS_CUSTOM: '/analytics/custom',
  
  // Import/Export
  IMPORT_EXPORT: '/import-export',
  IMPORT_INVOICES: '/import-export/invoices',
  IMPORT_TRANSACTIONS: '/import-export/transactions',
  EXPORT_DATA: '/import-export/export',
  BACKUP: '/import-export/backup',
  
  // System
  SETTINGS: '/settings',
  SETTINGS_GENERAL: '/settings/general',
  SETTINGS_AI: '/settings/ai',
  SETTINGS_SYNC: '/settings/sync',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  FIRST_RUN: '/setup',
  HELP: '/help',
  ABOUT: '/about',
  
  // Search & Tools
  SEARCH: '/search',
  REPORTS: '/reports',
  TOOLS: '/tools',
} as const;

// ===== QUERY KEYS V4.0 =====
export const QUERY_KEYS = {
  // System
  HEALTH: ['health'],
  SYSTEM_STATUS: ['system', 'status'],
  FIRST_RUN: ['first-run'],
  PERFORMANCE: ['performance'],
  
  // Core Data
  DASHBOARD: ['dashboard'],
  INVOICES: ['invoices'],
  INVOICE: ['invoice'],
  TRANSACTIONS: ['transactions'],
  TRANSACTION: ['transaction'],
  ANAGRAPHICS: ['anagraphics'],
  ANAGRAPHICS_ITEM: ['anagraphics-item'],
  
  // Analytics V3.0
  ANALYTICS: ['analytics'],
  EXECUTIVE_DASHBOARD: ['analytics', 'executive'],
  OPERATIONS_DASHBOARD: ['analytics', 'operations'],
  AI_INSIGHTS: ['analytics', 'ai-insights'],
  CUSTOM_ANALYTICS: ['analytics', 'custom'],
  REAL_TIME_METRICS: ['analytics', 'realtime'],
  KPI: ['kpi'],
  
  // Reconciliation V4.0
  RECONCILIATION: ['reconciliation'],
  RECONCILIATION_SUGGESTIONS: ['reconciliation', 'suggestions'],
  SMART_SUGGESTIONS: ['reconciliation', 'smart-suggestions'],
  RECONCILIATION_OPPORTUNITIES: ['reconciliation', 'opportunities'],
  CLIENT_RELIABILITY: ['reconciliation', 'client-reliability'],
  PATTERN_ANALYSIS: ['reconciliation', 'patterns'],
  
  // Search & Filtering
  SEARCH: ['search'],
  SEARCH_INVOICES: ['search', 'invoices'],
  SEARCH_TRANSACTIONS: ['search', 'transactions'],
  SEARCH_ANAGRAPHICS: ['search', 'anagraphics'],
  
  // Import/Export
  IMPORT_EXPORT: ['import-export'],
  IMPORT_HISTORY: ['import-export', 'history'],
  EXPORT_TEMPLATES: ['import-export', 'templates'],
  
  // Sync
  SYNC: ['sync'],
  SYNC_STATUS: ['sync', 'status'],
  SYNC_HISTORY: ['sync', 'history'],
  
  // Statistics
  STATS: ['stats'],
  STATS_INVOICES: ['stats', 'invoices'],
  STATS_TRANSACTIONS: ['stats', 'transactions'],
  STATS_ANAGRAPHICS: ['stats', 'anagraphics'],
  STATS_RECONCILIATION: ['stats', 'reconciliation'],
} as const;

// ===== LOCAL STORAGE KEYS V4.0 =====
export const STORAGE_KEYS = {
  // Core Settings
  THEME: 'fattura-analyzer-theme-v4',
  SIDEBAR_COLLAPSED: 'fattura-analyzer-sidebar-collapsed-v4',
  USER_PREFERENCES: 'fattura-analyzer-preferences-v4',
  
  // Table & UI Settings
  TABLE_SETTINGS: 'fattura-analyzer-table-settings-v4',
  COLUMN_WIDTHS: 'fattura-analyzer-column-widths-v4',
  FILTER_PREFERENCES: 'fattura-analyzer-filter-preferences-v4',
  DASHBOARD_LAYOUT: 'fattura-analyzer-dashboard-layout-v4',
  
  // Search & History
  RECENT_SEARCHES: 'fattura-analyzer-recent-searches-v4',
  SEARCH_FILTERS: 'fattura-analyzer-search-filters-v4',
  RECENT_ITEMS: 'fattura-analyzer-recent-items-v4',
  
  // AI & Smart Features V4.0
  AI_PREFERENCES: 'fattura-analyzer-ai-preferences-v4',
  CONFIDENCE_SETTINGS: 'fattura-analyzer-confidence-settings-v4',
  SMART_RECONCILIATION_PREFS: 'fattura-analyzer-smart-reconciliation-v4',
  PATTERN_CACHE: 'fattura-analyzer-pattern-cache-v4',
  
  // Performance & Cache
  CACHE_PREFERENCES: 'fattura-analyzer-cache-preferences-v4',
  PERFORMANCE_SETTINGS: 'fattura-analyzer-performance-v4',
  OFFLINE_DATA: 'fattura-analyzer-offline-data-v4',
  
  // Import/Export
  IMPORT_TEMPLATES: 'fattura-analyzer-import-templates-v4',
  EXPORT_PREFERENCES: 'fattura-analyzer-export-preferences-v4',
  
  // Sync
  SYNC_SETTINGS: 'fattura-analyzer-sync-settings-v4',
  LAST_SYNC: 'fattura-analyzer-last-sync-v4',
  
  // Session & Security
  SESSION_DATA: 'fattura-analyzer-session-v4',
  AUTO_SAVE_DATA: 'fattura-analyzer-auto-save-v4',
} as const;

// ===== RECONCILIATION CONFIG V4.0 =====
export const RECONCILIATION_CONFIG = {
  // Confidence Thresholds
  ULTRA_HIGH_CONFIDENCE_THRESHOLD: 0.98,
  HIGH_CONFIDENCE_THRESHOLD: 0.90,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.75,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.60,
  LOW_CONFIDENCE_THRESHOLD: 0.40,
  
  // Auto-reconciliation
  AUTO_RECONCILE_THRESHOLD: 0.95,
  AUTO_RECONCILE_MAX_AMOUNT: 10000, // Soglia importo per auto-riconciliazione
  BATCH_AUTO_RECONCILE_LIMIT: 50,
  
  // Matching Parameters
  AMOUNT_TOLERANCE_PERCENTAGE: 0.01, // 1%
  AMOUNT_TOLERANCE_ABSOLUTE: 0.02, // 2 centesimi
  DATE_TOLERANCE_DAYS: 30,
  MAX_SUGGESTIONS: 100,
  MAX_COMBINATIONS: 1000,
  MAX_SEARCH_TIME_MS: 10000,
  
  // AI Enhancement V4.0
  AI_PATTERN_WEIGHT: 0.3,
  CLIENT_HISTORY_WEIGHT: 0.25,
  AMOUNT_MATCH_WEIGHT: 0.2,
  DATE_PROXIMITY_WEIGHT: 0.15,
  DESCRIPTION_SIMILARITY_WEIGHT: 0.1,
  
  // Performance Settings
  PARALLEL_PROCESSING_THRESHOLD: 100,
  CACHE_SUGGESTIONS_TTL: 5 * 60 * 1000, // 5 minuti
  BACKGROUND_PROCESSING_DELAY: 1000,
  
  // Smart Features V4.0
  ENABLE_LEARNING: true,
  LEARNING_THRESHOLD: 0.85,
  PATTERN_RECOGNITION: true,
  CLIENT_RELIABILITY_ANALYSIS: true,
  PREDICTIVE_SCORING: true,
} as const;

// ===== ANALYTICS CONFIG V4.0 =====
export const ANALYTICS_CONFIG = {
  // Time Periods
  DEFAULT_PERIOD_MONTHS: 12,
  MAX_PERIOD_MONTHS: 120, // 10 anni
  QUICK_PERIOD_OPTIONS: [1, 3, 6, 12, 24, 36],
  COMPARISON_PERIODS: ['previous_period', 'previous_year', 'same_period_last_year'],
  
  // Chart Settings
  CHART_HEIGHT: 400,
  MOBILE_CHART_HEIGHT: 250,
  DASHBOARD_CHART_HEIGHT: 300,
  FULL_SCREEN_CHART_HEIGHT: 600,
  
  // Refresh Intervals
  KPI_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minuti
  REAL_TIME_REFRESH_INTERVAL: 30 * 1000, // 30 secondi
  DASHBOARD_REFRESH_INTERVAL: 2 * 60 * 1000, // 2 minuti
  
  // Data Points
  MAX_CHART_DATA_POINTS: 1000,
  DEFAULT_DATA_POINTS: 50,
  MOBILE_DATA_POINTS: 20,
  
  // AI Analytics V4.0
  AI_ANALYSIS_CACHE_TTL: 15 * 60 * 1000, // 15 minuti
  PREDICTION_HORIZON_MONTHS: 6,
  CONFIDENCE_INTERVALS: [0.68, 0.95, 0.99],
  SEASONALITY_DETECTION: true,
  TREND_ANALYSIS: true,
  ANOMALY_DETECTION: true,
  
  // Export Settings
  EXPORT_MAX_ROWS: 100000,
  EXPORT_FORMATS: ['excel', 'csv', 'pdf', 'json'],
  CHART_EXPORT_FORMATS: ['png', 'svg', 'pdf'],
  
  // Performance
  LAZY_LOADING: true,
  VIRTUAL_SCROLLING: true,
  DATA_COMPRESSION: true,
} as const;

// ===== NOTIFICATION CONFIG V4.0 =====
export const NOTIFICATION_CONFIG = {
  // Durations
  DEFAULT_DURATION: 5000,
  SUCCESS_DURATION: 3000,
  INFO_DURATION: 4000,
  WARNING_DURATION: 6000,
  ERROR_DURATION: 8000,
  CRITICAL_DURATION: 0, // Non si chiude automaticamente
  
  // Limits
  MAX_NOTIFICATIONS: 8,
  MAX_PERSISTENT_NOTIFICATIONS: 3,
  QUEUE_LIMIT: 20,
  
  // Positioning
  POSITION: 'top-right',
  MOBILE_POSITION: 'bottom',
  
  // Types V4.0
  TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    AI_INSIGHT: 'ai-insight', // Nuovo V4.0
    SYNC_UPDATE: 'sync-update', // Nuovo V4.0
    SYSTEM_ALERT: 'system-alert', // Nuovo V4.0
    RECONCILIATION: 'reconciliation', // Nuovo V4.0
  },
  
  // Priorities
  PRIORITIES: {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    CRITICAL: 4,
    SYSTEM: 5,
  },
  
  // Animation
  ANIMATION_DURATION: 300,
  STACKING_OFFSET: 10,
  
  // Grouping V4.0
  GROUP_SIMILAR: true,
  GROUP_TIME_WINDOW: 5000, // 5 secondi
  MAX_GROUP_SIZE: 5,
} as const;

// ===== REGEX PATTERNS V4.0 =====
export const REGEX_PATTERNS = {
  // Codici Fiscali Italiani
  CODICE_FISCALE: /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/,
  PARTITA_IVA: /^[0-9]{11}$/,
  PARTITA_IVA_EU: /^[A-Z]{2}[0-9A-Z]+$/,
  
  // Codici Postali
  CAP: /^[0-9]{5}$/,
  CAP_INTERNATIONAL: /^[0-9A-Z\s\-]{3,10}$/,
  
  // Banking
  IBAN: /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/,
  IBAN_IT: /^IT[0-9]{2}[A-Z][0-9]{10}[0-9A-Z]{12}$/,
  BIC: /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  
  // Contatti
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  EMAIL_STRICT: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // Telefoni
  PHONE_IT: /^[0-9]{8,10}$/,
  PHONE_IT_INTERNATIONAL: /^39[0-9]{8,10}$/,
  PHONE_INTERNATIONAL: /^\+?[1-9]\d{1,14}$/,
  PHONE_MOBILE_IT: /^3[0-9]{8,9}$/,
  
  // Numeri e Importi
  AMOUNT: /^\d+([.,]\d{1,2})?$/,
  AMOUNT_NEGATIVE: /^-?\d+([.,]\d{1,2})?$/,
  INTEGER: /^\d+$/,
  DECIMAL: /^\d*[.,]?\d*$/,
  PERCENTAGE: /^\d+([.,]\d{1,2})?%?$/,
  
  // Date
  DATE_IT: /^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  DATETIME_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  
  // Business Documents
  INVOICE_NUMBER: /^[A-Z0-9\-_\/]{1,50}$/,
  DOCUMENT_CODE: /^[A-Z0-9\-_]{1,20}$/,
  REFERENCE_CODE: /^[A-Z0-9\-_\/\s]{1,100}$/,
  
  // File & System
  FILENAME: /^[^<>:"/\\|?*\x00-\x1f]*[^<>:"/\\|?*\x00-\x1f .]$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  COLOR_HEX: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  
  // Security
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  
  // AI & ML V4.0
  CONFIDENCE_SCORE: /^0\.\d{1,4}$|^1\.0000?$/,
  MODEL_VERSION: /^v\d+\.\d+(\.\d+)?$/,
  AI_PATTERN_ID: /^[a-z0-9\-]{8,36}$/,
} as const;

// ===== IMPORT/EXPORT CONFIG V4.0 =====
export const IMPORT_EXPORT_CONFIG = {
  // Batch Processing
  BATCH_SIZE: 100, // Aumentato per V4.0
  MAX_CONCURRENT_REQUESTS: 5,
  PARALLEL_PROCESSING_THRESHOLD: 50,
  QUEUE_PROCESSING_INTERVAL: 500,
  
  // Progress & Feedback
  PROGRESS_UPDATE_INTERVAL: 100,
  PROGRESS_DEBOUNCE: 250,
  STATUS_CHECK_INTERVAL: 1000,
  
  // CSV Settings
  CSV_DELIMITER: ',',
  CSV_QUOTE_CHAR: '"',
  CSV_ESCAPE_CHAR: '"',
  CSV_ENCODING: 'UTF-8',
  CSV_ENCODING_FALLBACK: 'ISO-8859-1',
  CSV_MAX_COLUMNS: 100,
  CSV_MAX_ROWS: 50000,
  
  // Excel Settings
  EXCEL_SHEET_NAME: 'Dati',
  EXCEL_MAX_SHEETS: 10,
  EXCEL_MAX_ROWS: 100000,
  EXCEL_DATE_FORMAT: 'dd/mm/yyyy',
  
  // Validation
  VALIDATION_SAMPLE_SIZE: 100,
  MAX_VALIDATION_ERRORS: 50,
  STOP_ON_CRITICAL_ERRORS: true,
  
  // File Processing V4.0
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  MAX_FILE_SIZE_MB: 50,
  SUPPORTED_ENCODINGS: ['UTF-8', 'ISO-8859-1', 'Windows-1252'],
  AUTO_DETECT_ENCODING: true,
  
  // Templates
  TEMPLATE_VERSION: '4.0',
  INCLUDE_SAMPLE_DATA: true,
  TEMPLATE_LANGUAGES: ['it', 'en'],
  
  // Export Options V4.0
  EXPORT_FORMATS: ['excel', 'csv', 'json', 'xml', 'pdf'],
  EXPORT_COMPRESSION: true,
  EXPORT_WATERMARK: true,
  EXPORT_METADATA: true,
  
  // Backup
  BACKUP_COMPRESSION_LEVEL: 6,
  BACKUP_INCLUDE_SETTINGS: true,
  BACKUP_INCLUDE_CACHE: false,
  BACKUP_ENCRYPTION: false, // Per future implementazioni
} as const;

// ===== SECURITY CONFIG V4.0 =====
export const SECURITY_CONFIG = {
  // Session Management
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 ora (aumentato)
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minuti
  AUTO_LOGOUT_WARNING: 5 * 60 * 1000, // 5 minuti prima
  EXTEND_SESSION_THRESHOLD: 10 * 60 * 1000, // 10 minuti
  
  // Authentication
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minuti
  PASSWORD_RESET_TIMEOUT: 24 * 60 * 60 * 1000, // 24 ore
  TWO_FACTOR_TIMEOUT: 5 * 60 * 1000, // 5 minuti
  
  // API Security
  API_RATE_LIMIT: 1000, // richieste per minuto
  API_BURST_LIMIT: 100, // richieste in burst
  API_TIMEOUT: 30000, // 30 secondi
  
  // Data Protection
  ENCRYPT_SENSITIVE_DATA: true,
  HASH_PERSONAL_DATA: true,
  AUDIT_LOG_RETENTION: 90, // giorni
  
  // Headers & CORS
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
  
  // File Security V4.0
  SCAN_UPLOADED_FILES: true,
  QUARANTINE_SUSPICIOUS_FILES: true,
  MAX_FILE_SCAN_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_SIGNATURES: {
    PDF: ['25504446'],
    EXCEL: ['504B0304', '504B030414'],
    XML: ['3C3F786D6C'],
    CSV: [], // Testo semplice
  },
} as const;

// ===== APPLICATION STATUS V4.0 =====
export const APP_STATUS = {
  INITIALIZING: 'initializing',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
  UPDATING: 'updating', // Nuovo V4.0
  SYNCING: 'syncing', // Nuovo V4.0
  DEGRADED: 'degraded', // Nuovo V4.0
} as const;

// ===== OPERATION PRIORITY V4.0 =====
export const OPERATION_PRIORITY = {
  BACKGROUND: 0,
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4,
  REAL_TIME: 5, // Nuovo V4.0
  USER_INITIATED: 6, // Nuovo V4.0
} as const;

// ===== LOG LEVELS V4.0 =====
export const LOG_LEVELS = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
  
  // Custom levels V4.0
  AI: 'ai',
  RECONCILIATION: 'reconciliation',
  PERFORMANCE: 'performance',
  AUDIT: 'audit',
} as const;

// ===== FEATURE FLAGS V4.0 =====
export const FEATURE_FLAGS = {
  // Core Features
  ENABLE_AI_FEATURES: true,
  ENABLE_SMART_RECONCILIATION: true,
  ENABLE_REAL_TIME_UPDATES: true,
  ENABLE_CLOUD_SYNC: true,
  ENABLE_ADVANCED_ANALYTICS: true,
  
  // Experimental Features
  ENABLE_VOICE_COMMANDS: false,
  ENABLE_MOBILE_APP: false,
  ENABLE_API_V5: false,
  ENABLE_BLOCKCHAIN_AUDIT: false,
  
  // Performance Features
  ENABLE_SERVICE_WORKER: true,
  ENABLE_OFFLINE_MODE: true,
  ENABLE_COMPRESSION: true,
  ENABLE_LAZY_LOADING: true,
  
  // Security Features
  ENABLE_TWO_FACTOR: false,
  ENABLE_BIOMETRIC_AUTH: false,
  ENABLE_ENCRYPTION: true,
  
  // AI/ML Features V4.0
  ENABLE_AUTO_CATEGORIZATION: true,
  ENABLE_PREDICTIVE_ANALYTICS: true,
  ENABLE_ANOMALY_DETECTION: true,
  ENABLE_NATURAL_LANGUAGE_SEARCH: false,
  ENABLE_DOCUMENT_OCR: false,
} as const;

// ===== PERFORMANCE THRESHOLDS V4.0 =====
export const PERFORMANCE_THRESHOLDS = {
  // Response Times (ms)
  API_RESPONSE_GOOD: 200,
  API_RESPONSE_ACCEPTABLE: 500,
  API_RESPONSE_SLOW: 1000,
  API_RESPONSE_CRITICAL: 3000,
  
  // UI Performance
  RENDER_TIME_GOOD: 16, // 60fps
  RENDER_TIME_ACCEPTABLE: 32, // 30fps
  RENDER_TIME_SLOW: 100,
  
  // Memory Usage (MB)
  MEMORY_USAGE_GOOD: 50,
  MEMORY_USAGE_ACCEPTABLE: 100,
  MEMORY_USAGE_HIGH: 200,
  MEMORY_USAGE_CRITICAL: 500,
  
  // Cache Performance
  CACHE_HIT_RATE_GOOD: 0.8,
  CACHE_HIT_RATE_ACCEPTABLE: 0.6,
  CACHE_HIT_RATE_POOR: 0.4,
  
  // Database Performance
  DB_QUERY_FAST: 50,
  DB_QUERY_ACCEPTABLE: 200,
  DB_QUERY_SLOW: 500,
  DB_QUERY_CRITICAL: 1000,
  
  // AI Performance V4.0
  AI_INFERENCE_FAST: 100,
  AI_INFERENCE_ACCEPTABLE: 500,
  AI_INFERENCE_SLOW: 2000,
  
  // Reconciliation Performance
  RECONCILIATION_FAST: 1000,
  RECONCILIATION_ACCEPTABLE: 5000,
  RECONCILIATION_SLOW: 15000,
} as const;

// ===== KEYBOARD SHORTCUTS V4.0 =====
export const KEYBOARD_SHORTCUTS = {
  // Global
  GLOBAL_SEARCH: 'ctrl+k',
  REFRESH_DATA: 'ctrl+r',
  TOGGLE_SIDEBAR: 'ctrl+b',
  TOGGLE_THEME: 'ctrl+shift+t',
  
  // Navigation
  GO_TO_DASHBOARD: 'ctrl+shift+d',
  GO_TO_INVOICES: 'ctrl+shift+i',
  GO_TO_TRANSACTIONS: 'ctrl+shift+t',
  GO_TO_RECONCILIATION: 'ctrl+shift+r',
  
  // Actions
  CREATE_NEW: 'ctrl+n',
  SAVE: 'ctrl+s',
  DELETE: 'delete',
  EXPORT: 'ctrl+e',
  IMPORT: 'ctrl+i',
  
  // Reconciliation V4.0
  APPLY_BEST_MATCHES: 'ctrl+shift+enter',
  CLEAR_SELECTION: 'escape',
  SELECT_ALL: 'ctrl+a',
  
  // AI Features V4.0
  AI_ASSISTANT: 'ctrl+space',
  SMART_SUGGESTIONS: 'ctrl+shift+s',
  QUICK_ANALYSIS: 'ctrl+shift+a',
  
  // Accessibility
  FOCUS_NEXT: 'tab',
  FOCUS_PREVIOUS: 'shift+tab',
  ACTIVATE: 'enter',
  CANCEL: 'escape',
} as const;

// ===== EXPORT DEFAULT CONFIGURATION =====
export const DEFAULT_CONFIG = {
  // Sistema
  SYSTEM_NAME: 'FatturaAnalyzer V4.0',
  SYSTEM_VERSION: '4.0.0',
  SYSTEM_BUILD: new Date().toISOString(),
  
  // API
  API_VERSION: 'V4.0',
  API_TIMEOUT: API_CONFIG.TIMEOUT,
  
  // UI
  DEFAULT_THEME: 'system',
  DEFAULT_LOCALE: 'it-IT',
  DEFAULT_CURRENCY: 'EUR',
  
  // Funzionalità
  FEATURES_ENABLED: V4_FEATURES,
  FEATURE_FLAGS_ENABLED: FEATURE_FLAGS,
  
  // Performance
  CACHE_ENABLED: true,
  REAL_TIME_ENABLED: false,
  AI_ENABLED: true,
  
  // Sicurezza
  SECURITY_LEVEL: 'standard',
  AUDIT_ENABLED: true,
  
  // Business Rules
  DEFAULT_RECONCILIATION_CONFIDENCE: RECONCILIATION_CONFIG.DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_ANALYTICS_PERIOD: ANALYTICS_CONFIG.DEFAULT_PERIOD_MONTHS,
  DEFAULT_PAGE_SIZE: DEFAULT_PAGE_SIZE,
} as const;

// Type exports per TypeScript
export type ApiEndpoint = keyof typeof API_CONFIG.ENDPOINTS;
export type V4Feature = keyof typeof V4_FEATURES;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];
export type ReconciliationStatus = typeof RECONCILIATION_STATUSES[number];
export type InvoiceType = typeof INVOICE_TYPES[number];
export type AnagraphicsType = typeof ANAGRAPHICS_TYPES[number];
export type Theme = typeof THEMES[number];
export type AppStatus = typeof APP_STATUS[number];
export type LogLevel = typeof LOG_LEVELS[number];
export type OperationPriority = typeof OPERATION_PRIORITY[number];
export type Route = typeof ROUTES[keyof typeof ROUTES];
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
export type QueryKey = typeof QUERY_KEYS[keyof typeof QUERY_KEYS];

export default {
  API_CONFIG,
  V4_FEATURES,
  APP_LIMITS,
  SUPPORTED_FILE_FORMATS,
  MIME_TYPES,
  PAYMENT_STATUSES,
  RECONCILIATION_STATUSES,
  INVOICE_TYPES,
  ANAGRAPHICS_TYPES,
  AI_CONFIDENCE_LEVELS,
  THEMES,
  ROUTES,
  QUERY_KEYS,
  STORAGE_KEYS,
  RECONCILIATION_CONFIG,
  ANALYTICS_CONFIG,
  NOTIFICATION_CONFIG,
  REGEX_PATTERNS,
  IMPORT_EXPORT_CONFIG,
  SECURITY_CONFIG,
  FEATURE_FLAGS,
  PERFORMANCE_THRESHOLDS,
  KEYBOARD_SHORTCUTS,
  DEFAULT_CONFIG,
};
