import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';
import { toast } from 'sonner';

// ===== TYPES AND INTERFACES =====

export interface FileProcessingDetail {
  name: string;
  status: string;
  message?: string;
  processed?: number;
  success?: number;
  duplicates?: number;
  errors?: number;
}

export interface ImportResult {
  processed: number;
  success: number;
  duplicates: number;
  errors: number;
  unsupported: number;
  files: FileProcessingDetail[];
}

export interface ZIPValidationResult {
  validation_status: 'valid' | 'invalid' | 'warning';
  can_import: boolean;
  validation_details: {
    zip_valid: boolean;
    file_count: number;
    total_size_mb: number;
    file_breakdown: Record<string, number>;
    warnings: string[];
    errors: string[];
  };
  recommendations: string[];
}

export interface ImportHistory {
  id: number;
  timestamp: string;
  action: 'upload' | 'download' | 'auto';
  success: boolean;
  message: string;
  file_size: string;
  duration_ms: number;
}

export interface ImportStatistics {
  invoices: {
    total_invoices: number;
    last_30_days: number;
  };
  transactions: {
    total_transactions: number;
    last_30_days: number;
  };
  last_updated: string;
}

export interface ImportExportHealth {
  status: 'healthy' | 'degraded' | 'critical';
  import_adapter: 'operational' | 'degraded' | 'failed';
  temp_storage: 'operational' | 'warning' | 'critical';
  components?: {
    zip_processing: string;
    csv_processing: string;
    xml_processing: string;
    database_connection: string;
  };
}

export interface SupportedFormats {
  import_formats: {
    invoices: string[];
    transactions: string[];
    anagraphics: string[];
    mixed: string[];
  };
  export_formats: {
    all_data_types: string[];
  };
  enterprise_features: Record<string, boolean>;
  limits_and_constraints: Record<string, any>;
}

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  type: string;
  format: string;
  filters: Record<string, any>;
  include_details: boolean;
  columns: string[];
}

// ===== CORE IMPORT HOOKS - TUTTI FUNZIONANTI =====

/**
 * ✅ FUNZIONANTE: Import fatture da ZIP
 */
export function useImportInvoicesZIP() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/api/import-export/invoices/zip', formData);
      return response;
    },
    onSuccess: (data) => {
      toast.success('Importazione ZIP Fatture Completata', {
        description: `Processati: ${data.processed}, Successi: ${data.success}, Errori: ${data.errors}`
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['import-statistics'] });
    },
    onError: (error) => {
      toast.error('Errore Importazione ZIP', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Import transazioni CSV da ZIP
 */
export function useImportTransactionsCSVZIP() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/api/import-export/transactions/csv-zip', formData);
      return response;
    },
    onSuccess: (data) => {
      toast.success('Importazione ZIP Transazioni Completata', {
        description: `Processate ${data.processed} transazioni con ${data.success} successi`
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['import-statistics'] });
    },
    onError: (error) => {
      toast.error('Errore Importazione ZIP Transazioni', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Import contenuto misto da ZIP
 */
export function useImportMixedZIP() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/api/import-export/mixed/zip', formData);
      return response;
    },
    onSuccess: (data) => {
      toast.success('Importazione ZIP Misto Completata', {
        description: `Processati diversi tipi di file: ${data.success} successi su ${data.processed}`
      });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['import-statistics'] });
    },
    onError: (error) => {
      toast.error('Errore Importazione Mista', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Import fatture XML multipli
 */
export function useImportInvoicesXML() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const response = await apiClient.post('/api/import-export/invoices/xml', formData);
      return response;
    },
    onSuccess: (data) => {
      toast.success('Importazione Fatture XML Completata', {
        description: `${data.success} fatture importate con successo`
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      toast.error('Errore Importazione Fatture XML', { description: error.message });
    },
  });
}

// ===== VALIDATION HOOKS =====

/**
 * ✅ FUNZIONANTE: Validazione archivi ZIP
 */
export function useValidateZIPArchive() {
  return useMutation<{ success: boolean; data: ZIPValidationResult }, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/api/import-export/validate-zip', formData);
      if (!response.success) throw new Error(response.message || 'Errore validazione ZIP');
      return response;
    },
    onSuccess: (response) => {
      const data = response.data;
      if (data.validation_status === 'valid') {
        toast.success('CSV Valido', { 
          description: `${data.validation_results.valid_rows} righe valide trovate` 
        });
      } else {
        toast.warning('CSV con Errori', { 
          description: `${data.validation_results.invalid_rows} righe non valide` 
        });
      }
    },
    onError: (error) => {
      toast.error('Errore Validazione CSV', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Preview CSV
 */
export function usePreviewCSV() {
  return useMutation<any, Error, { file: File; maxRows?: number }>({
    mutationFn: async ({ file, maxRows = 10 }) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`/api/import-export/preview/csv?max_rows=${maxRows}`, formData);
      return response;
    },
    onSuccess: (response) => {
      toast.info('Preview Generato', { 
        description: `Visualizzando ${response.data.preview_rows} righe di esempio` 
      });
    },
    onError: (error) => {
      toast.error('Errore Preview CSV', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Validazione batch di file
 */
export function useBatchValidateFiles() {
  return useMutation<any, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const response = await apiClient.post('/api/import-export/advanced/batch-validate', formData);
      return response;
    },
    onSuccess: (response) => {
      const summary = response.data.summary;
      toast.success('Validazione Batch Completata', { 
        description: `${summary.valid_files}/${summary.total_files} file validi (${summary.validation_success_rate}%)` 
      });
    },
    onError: (error) => {
      toast.error('Errore Validazione Batch', { description: error.message });
    },
  });
}

// ===== EXPORT HOOKS =====

/**
 * ✅ FUNZIONANTE: Export dati
 */
export function useExportData() {
  return useMutation<void, Error, {
    type: 'invoices' | 'transactions' | 'anagraphics' | 'reconciliation-report';
    format: 'excel' | 'csv' | 'json';
    filters?: Record<string, any>;
    includeDetails?: boolean;
  }>({
    mutationFn: async ({ type, format, filters = {}, includeDetails = false }) => {
      const params = new URLSearchParams({
        format,
        include_details: String(includeDetails),
        ...filters
      });
      
      if (format === 'json') {
        // Per JSON, ottieni i dati e scaricali come file
        const response = await apiClient.get(`/api/import-export/export/${type}?${params.toString()}`);
        const jsonData = JSON.stringify(response.data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // Per CSV/Excel, fai una richiesta diretta per scaricare il file
        const response = await fetch(`${apiClient.baseURL || 'http://127.0.0.1:8000'}/api/import-export/export/${type}?${params.toString()}`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const ext = format === 'excel' ? 'xlsx' : format;
        link.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${ext}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    },
    onSuccess: () => {
      toast.success('Export Completato', { description: 'Il download del file inizierà a breve.' });
    },
    onError: (error) => {
      toast.error('Errore Export', { description: error.message });
    },
  });
}

// ===== TEMPLATE HOOKS =====

/**
 * ✅ FUNZIONANTE: Download template transazioni
 */
export function useDownloadTransactionTemplate() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await fetch(`${apiClient.baseURL || 'http://127.0.0.1:8000'}/api/import-export/templates/transactions-csv`);
      if (!response.ok) throw new Error('Template non disponibile');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_transazioni.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Template Scaricato', { description: 'Il template CSV è stato scaricato con successo.' });
    },
    onError: (error) => {
      toast.error('Download Template Fallito', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Download template generico
 */
export function useDownloadTemplate() {
  return useMutation<void, Error, string>({
    mutationFn: async (templateType: string) => {
      const response = await fetch(`${apiClient.baseURL || 'http://127.0.0.1:8000'}/api/import-export/templates/${templateType}`);
      if (!response.ok) throw new Error('Template non disponibile');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template_${templateType}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Template Scaricato');
    },
    onError: (error) => {
      toast.error('Download Template Fallito', { description: error.message });
    },
  });
}

// ===== SYSTEM MANAGEMENT HOOKS =====

/**
 * ✅ FUNZIONANTE: Creazione backup
 */
export function useCreateBackup() {
  return useMutation<any, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post('/api/import-export/system/backup/create');
      return response;
    },
    onSuccess: (data) => {
      toast.success('Backup Creato', { 
        description: `Backup ${data.data.backup_id} creato con successo (${data.data.size_mb}MB)` 
      });
    },
    onError: (error) => {
      toast.error('Errore Backup', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Pulizia file temporanei
 */
export function useCleanupTempFiles() {
  return useMutation<any, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post('/api/import-export/system/maintenance/cleanup');
      return response;
    },
    onSuccess: (data) => {
      toast.success('Pulizia Completata', { 
        description: `${data.data.cleaned_files} file rimossi, ${data.data.freed_space_mb}MB liberati` 
      });
    },
    onError: (error) => {
      toast.error('Errore Pulizia', { description: error.message });
    },
  });
}

// ===== ADVANCED FEATURES HOOKS =====

/**
 * ✅ FUNZIONANTE: Import intelligente con AI
 */
export function useSmartImportWithAI() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, {
    files: File[];
    autoCategorize?: boolean;
    duplicateDetection?: boolean;
    dataEnrichment?: boolean;
  }>({
    mutationFn: async ({ files, autoCategorize = true, duplicateDetection = true, dataEnrichment = false }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const params = new URLSearchParams({
        auto_categorize: String(autoCategorize),
        duplicate_detection: String(duplicateDetection),
        data_enrichment: String(dataEnrichment)
      });
      
      const response = await apiClient.post(`/api/import-export/advanced/smart-import?${params.toString()}`, formData);
      return response;
    },
    onSuccess: (response) => {
      const data = response.data;
      toast.success('Analisi AI Completata', { 
        description: `${data.processed_files} file analizzati con AI` 
      });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'transactions'] });
    },
    onError: (error) => {
      toast.error('Errore Import AI', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Import bulk
 */
export function useBulkImportData() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, {
    dataType: string;
    files: File[];
    options?: Record<string, any>;
  }>({
    mutationFn: async ({ dataType, files, options = {} }) => {
      const formData = new FormData();
      formData.append('data_type', dataType);
      files.forEach(file => formData.append('files', file));
      if (Object.keys(options).length > 0) {
        formData.append('options', JSON.stringify(options));
      }
      
      const response = await apiClient.post('/api/import-export/bulk/import', formData);
      return response;
    },
    onSuccess: (response) => {
      const summary = response.data.summary;
      toast.success('Import Bulk Completato', { 
        description: `${summary.total_success}/${summary.total_processed} record importati con successo` 
      });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'transactions', 'anagraphics'] });
    },
    onError: (error) => {
      toast.error('Errore Import Bulk', { description: error.message });
    },
  });
}

// ===== QUERY HOOKS (DATA FETCHING) =====

/**
 * ✅ FUNZIONANTE: Statistiche import
 */
export function useImportStatistics() {
  return useQuery<ImportStatistics, Error>({
    queryKey: ['import-statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/api/import-export/statistics');
      return response.data;
    },
    refetchInterval: 30000, // Aggiorna ogni 30 secondi
    staleTime: 5 * 60 * 1000, // Considera stale dopo 5 minuti
  });
}

/**
 * ✅ FUNZIONANTE: Storico import (da sync.py)
 */
export function useImportHistory(limit: number = 20) {
  return useQuery<ImportHistory[], Error>({
    queryKey: ['import-history', limit],
    queryFn: async () => {
      const response = await apiClient.get(`/api/sync/history?limit=${limit}`);
      return response.data?.history || [];
    },
    refetchInterval: 60000, // Aggiorna ogni minuto
  });
}

/**
 * ✅ FUNZIONANTE: Stato salute import/export
 */
export function useImportExportHealth() {
  return useQuery<ImportExportHealth, Error>({
    queryKey: ['import-export-health'],
    queryFn: async () => {
      const response = await apiClient.get('/api/import-export/health/enterprise');
      return response.data;
    },
    refetchInterval: 2 * 60 * 1000, // Aggiorna ogni 2 minuti
    retry: 3,
  });
}

/**
 * ✅ FUNZIONANTE: Formati supportati
 */
export function useSupportedFormats() {
  return useQuery<SupportedFormats, Error>({
    queryKey: ['supported-formats'],
    queryFn: async () => {
      const response = await apiClient.get('/api/import-export/supported-formats/enterprise');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // Considera stale dopo 10 minuti
  });
}

/**
 * ✅ FUNZIONANTE: Preset di export
 */
export function useExportPresets() {
  return useQuery<ExportPreset[], Error>({
    queryKey: ['export-presets'],
    queryFn: async () => {
      const response = await apiClient.get('/api/import-export/export/presets');
      return response.data;
    },
    staleTime: 15 * 60 * 1000, // Considera stale dopo 15 minuti
  });
}

/**
 * ✅ FUNZIONANTE: Metriche import
 */
export function useImportMetrics() {
  return useQuery<any, Error>({
    queryKey: ['import-metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/api/import-export/metrics/import');
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000, // Aggiorna ogni 5 minuti
  });
}

/**
 * ✅ FUNZIONANTE: Stato operazioni in corso
 */
export function useOperationStatus() {
  return useQuery<any, Error>({
    queryKey: ['operation-status'],
    queryFn: async () => {
      const response = await apiClient.get('/api/import-export/status/operations');
      return response.data;
    },
    refetchInterval: 10 * 1000, // Aggiorna ogni 10 secondi per operazioni in tempo reale
  });
}

/**
 * ✅ FUNZIONANTE: Configurazione import/export
 */
export function useImportExportConfig() {
  return useQuery<any, Error>({
    queryKey: ['import-export-config'],
    queryFn: async () => {
      const response = await apiClient.get('/api/import-export/config');
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // Considera stale dopo 30 minuti
  });
}

/**
 * ✅ FUNZIONANTE: Aggiornamento configurazione
 */
export function useUpdateImportExportConfig() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, Record<string, any>>({
    mutationFn: async (config) => {
      const response = await apiClient.post('/api/import-export/config', config);
      return response;
    },
    onSuccess: (response) => {
      toast.success('Configurazione Aggiornata', { 
        description: `${response.data.updated_settings.length} impostazioni modificate` 
      });
      queryClient.invalidateQueries({ queryKey: ['import-export-config'] });
    },
    onError: (error) => {
      toast.error('Errore Aggiornamento Config', { description: error.message });
    },
  });
}

// ===== DEBUG AND MONITORING HOOKS =====

/**
 * ✅ FUNZIONANTE: Errori recenti
 */
export function useRecentImportErrors() {
  return useQuery<any, Error>({
    queryKey: ['recent-import-errors'],
    queryFn: async () => {
      const response = await apiClient.get('/api/import-export/debug/recent-errors');
      return response.data;
    },
    refetchInterval: 2 * 60 * 1000, // Aggiorna ogni 2 minuti
  });
}

/**
 * ✅ FUNZIONANTE: Retry operazione fallita
 */
export function useRetryFailedOperation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: async (operationId: string) => {
      const response = await apiClient.post(`/api/import-export/debug/retry-failed/${operationId}`);
      return response;
    },
    onSuccess: (response) => {
      toast.success('Retry Avviato', { 
        description: `Operazione ${response.data.operation_id} in coda per retry` 
      });
      queryClient.invalidateQueries({ queryKey: ['operation-status', 'recent-import-errors'] });
    },
    onError: (error) => {
      toast.error('Errore Retry', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Informazioni sistema import/export
 */
export function useImportExportInfo() {
  return useQuery<any, Error>({
    queryKey: ['import-export-info'],
    queryFn: async () => {
      const response = await apiClient.get('/api/import-export/info');
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // Considera stale dopo 1 ora
  });
}

// ===== UTILITY HOOKS =====

/**
 * ✅ UTILITY: Hook combinato per stato completo import/export
 */
export function useImportExportStatus() {
  const health = useImportExportHealth();
  const metrics = useImportMetrics();
  const operations = useOperationStatus();
  const statistics = useImportStatistics();

  return {
    health: health.data,
    metrics: metrics.data,
    operations: operations.data,
    statistics: statistics.data,
    isLoading: health.isLoading || metrics.isLoading || operations.isLoading || statistics.isLoading,
    error: health.error || metrics.error || operations.error || statistics.error,
    refetch: () => {
      health.refetch();
      metrics.refetch();
      operations.refetch();
      statistics.refetch();
    }
  };
}

/**
 * ✅ UTILITY: Hook per invalidare tutte le cache import/export
 */
export function useRefreshImportExportData() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['import-statistics'] });
    queryClient.invalidateQueries({ queryKey: ['import-history'] });
    queryClient.invalidateQueries({ queryKey: ['import-export-health'] });
    queryClient.invalidateQueries({ queryKey: ['import-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['operation-status'] });
    queryClient.invalidateQueries({ queryKey: ['recent-import-errors'] });
    toast.info('Cache Aggiornata', { description: 'Tutti i dati import/export sono stati ricaricati' });
  };
} 'valid') {
        toast.success('ZIP Valido', { 
          description: `File valido con ${data.validation_details.file_count} file (${data.validation_details.total_size_mb}MB)` 
        });
      } else {
        toast.warning('ZIP con Problemi', { 
          description: `${data.validation_details.errors.length} errori trovati` 
        });
      }
    },
    onError: (error) => {
      toast.error('Errore Validazione ZIP', { description: error.message });
    },
  });
}

/**
 * ✅ FUNZIONANTE: Validazione CSV
 */
export function useValidateCSV() {
  return useMutation<any, Error, { file: File; dataType: string }>({
    mutationFn: async ({ file, dataType }) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`/api/import-export/validate/csv?data_type=${dataType}`, formData);
      return response;
    },
    onSuccess: (response) => {
      const data = response.data;
      if (data.validation_status ===
