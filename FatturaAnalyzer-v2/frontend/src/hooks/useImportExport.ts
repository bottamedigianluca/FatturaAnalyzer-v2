// hooks/useImportExport.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';

// Types
export interface ImportResult {
  processed: number;
  success: number;
  duplicates: number;
  errors: number;
  unsupported: number;
  files: Array<{
    name: string;
    status: string;
    message?: string;
  }>;
}

export interface ImportHistory {
  id: number;
  timestamp: string;
  type: string;
  files_processed: number;
  files_success: number;
  files_duplicates: number;
  files_errors: number;
  status: string;
}

export interface ImportStatistics {
  invoices: {
    total_invoices: number;
    last_30_days: number;
    last_7_days: number;
    active_invoices: number;
    passive_invoices: number;
  };
  transactions: {
    total_transactions: number;
    last_30_days: number;
    last_7_days: number;
    positive_transactions: number;
    negative_transactions: number;
  };
  recent_activity: Array<{
    type: string;
    last_import: string;
    count: number;
  }>;
  last_updated: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: string;
  statistics?: {
    total_rows: number;
    valid_transactions: number;
    date_range: {
      from: string;
      to: string;
    };
    amount_range: {
      min: number;
      max: number;
    };
  };
  preview?: Array<Record<string, any>>;
}

export interface CSVPreview {
  success: boolean;
  error?: string;
  total_rows: number;
  preview_rows: number;
  columns: string[];
  data: Array<Record<string, any>>;
  summary: {
    earliest_date: string;
    latest_date: string;
    total_amount: number;
    positive_transactions: number;
    negative_transactions: number;
  };
}

// === IMPORT HOOKS ===

/**
 * Hook per importare fatture XML/P7M
 */
export function useImportInvoicesXML() {
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();

  return useMutation<ImportResult, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await apiClient.post('/import-export/invoices/xml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.success) {
        throw new Error(response.message || 'Errore durante l\'importazione');
      }

      return response.data;
    },
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        title: 'Importazione completata',
        message: `${data.success} fatture importate con successo`,
        duration: 5000,
      });

      // Invalida cache correlate
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
      queryClient.invalidateQueries({ queryKey: ['import-statistics'] });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore importazione',
        message: error.message,
        duration: 8000,
      });
    },
  });
}

/**
 * Hook per validare file fatture prima dell'import
 */
export function useValidateInvoiceFiles() {
  const { addNotification } = useUIStore();

  return useMutation<any, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await apiClient.post('/import-export/invoices/xml/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.success) {
        throw new Error(response.message || 'Errore durante la validazione');
      }

      return response.data;
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore validazione',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Hook per importare transazioni CSV
 */
export function useImportTransactionsCSV() {
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();

  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/import-export/transactions/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.success) {
        throw new Error(response.message || 'Errore durante l\'importazione');
      }

      return response.data;
    },
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        title: 'Importazione completata',
        message: `${data.success} transazioni importate con successo`,
        duration: 5000,
      });

      // Invalida cache correlate
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
      queryClient.invalidateQueries({ queryKey: ['import-statistics'] });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore importazione CSV',
        message: error.message,
        duration: 8000,
      });
    },
  });
}

/**
 * Hook per validare CSV transazioni
 */
export function useValidateTransactionsCSV() {
  const { addNotification } = useUIStore();

  return useMutation<ValidationResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/import-export/transactions/csv/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!response.success) {
        throw new Error(response.message || 'Errore durante la validazione');
      }

      return response.data;
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore validazione CSV',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Hook per anteprima CSV
 */
export function usePreviewTransactionsCSV() {
  const { addNotification } = useUIStore();

  return useMutation<CSVPreview, Error, { file: File; maxRows?: number }>({
    mutationFn: async ({ file, maxRows = 10 }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(
        `/import-export/transactions/csv/preview?max_rows=${maxRows}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      if (!response.success) {
        throw new Error(response.message || 'Errore durante l\'anteprima');
      }

      return response.data;
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore anteprima CSV',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

// === EXPORT HOOKS ===

/**
 * Hook per esportare dati
 */
export function useExportData() {
  const { addNotification } = useUIStore();

  return useMutation<void, Error, {
    type: 'invoices' | 'transactions' | 'anagraphics' | 'reconciliation-report';
    format: 'excel' | 'csv' | 'json';
    filters?: Record<string, any>;
    includeDetails?: boolean;
  }>({
    mutationFn: async ({ type, format, filters = {}, includeDetails = false }) => {
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (includeDetails) {
        params.append('include_details', 'true');
      }

      // Aggiungi filtri
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const endpoint = `/import-export/export/${type.replace('_', '-')}`;
      const response = await fetch(`${apiClient.defaults.baseURL}${endpoint}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'esportazione');
      }

      // Download del file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'excel' ? 'xlsx' : format;
      link.download = `${type}_export_${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Export completato',
        message: 'Il file è stato scaricato con successo',
        duration: 3000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore export',
        message: error.message,
        duration: 8000,
      });
    },
  });
}

/**
 * Hook per scaricare template CSV
 */
export function useDownloadTransactionTemplate() {
  const { addNotification } = useUIStore();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await fetch(`${apiClient.defaults.baseURL}/import-export/templates/transactions-csv`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Errore durante il download del template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_transazioni_bancarie.csv';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Template scaricato',
        message: 'Il template CSV è stato scaricato con successo',
        duration: 3000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore download template',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Hook per creare backup completo
 */
export function useCreateBackup() {
  const { addNotification } = useUIStore();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await fetch(`${apiClient.defaults.baseURL}/import-export/backup/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Errore durante la creazione del backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `fattura_analyzer_backup_${timestamp}.zip`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Backup creato',
        message: 'Il backup completo è stato creato e scaricato',
        duration: 5000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore backup',
        message: error.message,
        duration: 8000,
      });
    },
  });
}

// === QUERY HOOKS ===

/**
 * Hook per ottenere cronologia import
 */
export function useImportHistory(limit: number = 50) {
  return useQuery<ImportHistory[], Error>({
    queryKey: ['import-history', limit],
    queryFn: async () => {
      const response = await apiClient.get(`/import-export/status/import-history?limit=${limit}`);
      
      if (!response.success) {
        throw new Error(response.message || 'Errore recupero cronologia');
      }

      return response.data.import_history;
    },
    staleTime: 5 * 60 * 1000, // 5 minuti
  });
}

/**
 * Hook per ottenere statistiche import/export
 */
export function useImportStatistics() {
  return useQuery<ImportStatistics, Error>({
    queryKey: ['import-statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/statistics');
      
      if (!response.success) {
        throw new Error(response.message || 'Errore recupero statistiche');
      }

      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minuti
  });
}

/**
 * Hook per health check import/export
 */
export function useImportExportHealth() {
  return useQuery<any, Error>({
    queryKey: ['import-export-health'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/health-check');
      
      if (!response.success) {
        throw new Error(response.message || 'Errore health check');
      }

      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minuti
    retry: 1,
  });
}

// === UTILITY HOOKS ===

/**
 * Hook per pulizia file temporanei
 */
export function useCleanupTempFiles() {
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();

  return useMutation<any, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post('/import-export/maintenance/cleanup');
      
      if (!response.success) {
        throw new Error(response.message || 'Errore durante la pulizia');
      }

      return response.data;
    },
    onSuccess: (data) => {
      addNotification({
        type: 'success',
        title: 'Pulizia completata',
        message: `${data.files_removed} file rimossi, ${data.space_freed_mb} MB liberati`,
        duration: 5000,
      });

      // Aggiorna health check
      queryClient.invalidateQueries({ queryKey: ['import-export-health'] });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore pulizia',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Hook composito per gestione completa import file
 */
export function useFileImport() {
  const validateInvoices = useValidateInvoiceFiles();
  const importInvoices = useImportInvoicesXML();
  const validateCSV = useValidateTransactionsCSV();
  const previewCSV = usePreviewTransactionsCSV();
  const importCSV = useImportTransactionsCSV();

  return {
    // Validation
    validateInvoices,
    validateCSV,
    previewCSV,
    
    // Import
    importInvoices,
    importCSV,
    
    // States
    isValidating: validateInvoices.isPending || validateCSV.isPending || previewCSV.isPending,
    isImporting: importInvoices.isPending || importCSV.isPending,
    
    // Errors
    validationError: validateInvoices.error || validateCSV.error || previewCSV.error,
    importError: importInvoices.error || importCSV.error,
  };
}

/**
 * Hook per gestione export con preset
 */
export function useExportPresets() {
  const exportData = useExportData();

  const exportPresets = {
    activeInvoicesExcel: () => exportData.mutate({
      type: 'invoices',
      format: 'excel',
      filters: { invoice_type: 'Attiva' },
      includeDetails: true,
    }),
    
    unreconciledTransactionsCSV: () => exportData.mutate({
      type: 'transactions',
      format: 'csv',
      filters: { status_filter: 'Da Riconciliare' },
    }),
    
    fullReconciliationReport: () => exportData.mutate({
      type: 'reconciliation-report',
      format: 'excel',
      includeDetails: true,
    }),
    
    clientsWithStats: () => exportData.mutate({
      type: 'anagraphics',
      format: 'excel',
      filters: { type_filter: 'Cliente' },
      includeDetails: true,
    }),
  };

  return {
    exportData,
    presets: exportPresets,
    isExporting: exportData.isPending,
    exportError: exportData.error,
  };
}
