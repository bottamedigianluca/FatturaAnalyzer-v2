import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';
import { toast } from 'sonner';

// ===== TYPES AND INTERFACES (ALLINEATE CON IL BACKEND) =====

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
  validation_status: 'valid' | 'invalid' | 'unknown';
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

export interface CSVValidationResult {
  validation_status: 'valid' | 'invalid';
  file_info: {
    filename: string;
    size_bytes: number;
    total_rows: number;
    headers: string[];
  };
  validation_results: {
    missing_columns: string[];
    valid_rows: number;
    invalid_rows: number;
    errors: string[];
  };
  can_import: boolean;
  recommendations: (string | null)[];
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
  import_adapter: 'operational' | 'degraded' | 'failed' | 'unknown';
  temp_storage: 'operational' | 'warning' | 'critical' | 'unknown';
  last_check: string;
  components?: {
    zip_processing: string;
    csv_processing: string;
    xml_processing: string;
    database_connection: string;
  };
  error?: string;
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
  validation_rules: Record<string, any>;
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

export interface ImportMetrics {
  performance_metrics: {
    avg_import_time_seconds: number;
    avg_files_per_minute: number;
    success_rate_percentage: number;
    avg_file_size_mb: number;
  };
  daily_stats: {
    imports_today: number;
    files_processed_today: number;
    data_imported_mb: number;
    errors_today: number;
  };
  monthly_trends: {
    total_imports: number;
    total_files: number;
    total_data_gb: number;
    peak_day: string;
    peak_imports: number;
  };
  system_health: {
    queue_length: number;
    processing_capacity: string;
    storage_usage_percentage: number;
    last_maintenance: string;
  };
}

export interface ImportHistoryItem {
  id: string;
  type: 'import' | 'export' | 'validation';
  status: 'completed' | 'failed' | 'in_progress';
  filename: string;
  timestamp: string;
  records_processed: number;
  success_count: number;
  error_count: number;
  message?: string;
}

export interface OperationStatus {
  active_operations: Array<{
    id: string;
    type: string;
    status: string;
    progress_percentage: number;
    started_at: string;
    estimated_completion: string;
    files_processed: number;
    files_total: number;
  }>;
  recent_operations: Array<{
    id: string;
    type: string;
    status: string;
    completed_at: string;
    duration_seconds: number;
    result: string;
  }>;
  queue_status: {
    pending_operations: number;
    estimated_wait_time_minutes: number;
    queue_capacity: string;
  };
}

// ===== CORE IMPORT HOOKS (VERIFICATI CON IL BACKEND) =====

/**
 * ✅ VERIFICATO: Import fatture da ZIP
 * Endpoint: POST /api/import-export/invoices/zip
 */
export function useImportInvoicesZIP() {
  const queryClient = useQueryClient();
  
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/invoices/zip', formData);
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
 * ✅ VERIFICATO: Import transazioni CSV da ZIP  
 * Endpoint: POST /api/import-export/transactions/csv-zip
 */
export function useImportTransactionsCSVZIP() {
  const queryClient = useQueryClient();
  
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/transactions/csv-zip', formData);
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
 * ✅ VERIFICATO: Import contenuto misto da ZIP
 * Endpoint: POST /api/import-export/mixed/zip
 */
export function useImportMixedZIP() {
  const queryClient = useQueryClient();
  
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/mixed/zip', formData);
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
 * ✅ VERIFICATO: Import fatture XML multipli
 * Endpoint: POST /api/import-export/invoices/xml
 */
export function useImportInvoicesXML() {
  const queryClient = useQueryClient();
  
  return useMutation<ImportResult, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const response = await apiClient.post('/import-export/invoices/xml', formData);
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

// ===== VALIDATION HOOKS (VERIFICATI) =====

/**
 * ✅ VERIFICATO: Validazione archivi ZIP
 * Endpoint: POST /api/import-export/validate-zip
 */
export function useValidateZIPArchive() {
  return useMutation<{ success: boolean; data: ZIPValidationResult }, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/validate-zip', formData);
      if (!response.success) throw new Error(response.message || 'Errore validazione ZIP');
      return response;
    },
    onSuccess: (response) => {
      const data = response.data;
      if (data.validation_status === 'valid') {
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
 * ✅ VERIFICATO: Validazione CSV
 * Endpoint: POST /api/import-export/validate/csv
 */
export function useValidateCSV() {
  return useMutation<{ success: boolean; data: CSVValidationResult }, Error, { file: File; dataType: string }>({
    mutationFn: async ({ file, dataType }) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`/import-export/validate/csv?data_type=${dataType}`, formData);
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
 * ✅ VERIFICATO: Preview CSV
 * Endpoint: POST /api/import-export/preview/csv
 */
export function usePreviewCSV() {
  return useMutation<any, Error, { file: File; maxRows?: number }>({
    mutationFn: async ({ file, maxRows = 10 }) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`/import-export/preview/csv?max_rows=${maxRows}`, formData);
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
 * ✅ VERIFICATO: Validazione batch di file
 * Endpoint: POST /api/import-export/advanced/batch-validate
 */
export function useBatchValidateFiles() {
  return useMutation<any, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const response = await apiClient.post('/import-export/advanced/batch-validate', formData);
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

// ===== EXPORT HOOKS (VERIFICATI) =====

/**
 * ✅ VERIFICATO: Export dati
 * Endpoint: GET /api/import-export/export/{data_type}
 */
export function useExportData() {
  return useMutation<void, Error, {
    type: 'invoices' | 'transactions' | 'anagraphics';
    format: 'excel' | 'csv' | 'json';
    filters?: Record<string, any>;
    includeDetails?: boolean;
  }>({
    mutationFn: async ({ type, format, filters = {}, includeDetails = false }) => {
      const params = new URLSearchParams({
        format,
        include_details: String(includeDetails),
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [key, String(value)])
        )
      });
      
      if (format === 'json') {
        // Per JSON, ottieni i dati e scaricali come file
        const response = await apiClient.get(`/import-export/export/${type}?${params.toString()}`);
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
        const baseURL = apiClient.baseURL || 'http://127.0.0.1:8000';
        const response = await fetch(`${baseURL}/api/import-export/export/${type}?${params.toString()}`);
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

// ===== TEMPLATE HOOKS (VERIFICATI) =====

/**
 * ✅ VERIFICATO: Download template transazioni
 * Endpoint: GET /api/import-export/templates/transactions-csv
 */
export function useDownloadTransactionTemplate() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const baseURL = apiClient.baseURL || 'http://127.0.0.1:8000';
      const response = await fetch(`${baseURL}/api/import-export/templates/transactions-csv`);
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
 * ✅ VERIFICATO: Download template generico
 * Endpoint: GET /api/import-export/templates/{template_type}
 */
export function useDownloadTemplate() {
  return useMutation<void, Error, string>({
    mutationFn: async (templateType: string) => {
      const baseURL = apiClient.baseURL || 'http://127.0.0.1:8000';
      const response = await fetch(`${baseURL}/api/import-export/templates/${templateType}`);
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

// ===== SYSTEM MANAGEMENT HOOKS (VERIFICATI) =====

/**
 * ✅ VERIFICATO: Creazione backup
 * Endpoint: POST /api/import-export/system/backup/create
 */
export function useCreateBackup() {
  return useMutation<any, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post('/import-export/system/backup/create');
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
 * ✅ VERIFICATO: Pulizia file temporanei
 * Endpoint: POST /api/import-export/system/maintenance/cleanup
 */
export function useCleanupTempFiles() {
  return useMutation<any, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.post('/import-export/system/maintenance/cleanup');
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

// ===== ADVANCED FEATURES HOOKS (VERIFICATI) =====

/**
 * ✅ VERIFICATO: Import intelligente con AI
 * Endpoint: POST /api/import-export/advanced/smart-import
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
      
      const response = await apiClient.post(`/import-export/advanced/smart-import?${params.toString()}`, formData);
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
 * ✅ VERIFICATO: Import bulk
 * Endpoint: POST /api/import-export/bulk/import
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
      
      const response = await apiClient.post('/import-export/bulk/import', formData);
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

// ===== QUERY HOOKS (DATA FETCHING - VERIFICATI) =====

/**
 * ✅ VERIFICATO: Statistiche import
 * Endpoint: GET /api/import-export/statistics
 */
export function useImportStatistics() {
  return useQuery<ImportStatistics, Error>({
    queryKey: ['import-statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/statistics');
      return response.data;
    },
    refetchInterval: 30000, // Aggiorna ogni 30 secondi
    staleTime: 5 * 60 * 1000, // Considera stale dopo 5 minuti
  });
}

/**
 * ✅ VERIFICATO: Stato salute import/export
 * Endpoint: GET /api/import-export/health/enterprise
 */
export function useImportExportHealth() {
  return useQuery<ImportExportHealth, Error>({
    queryKey: ['import-export-health'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/health/enterprise');
      return response.data;
    },
    refetchInterval: 2 * 60 * 1000, // Aggiorna ogni 2 minuti
    retry: 3,
  });
}

/**
 * ✅ VERIFICATO: Formati supportati
 * Endpoint: GET /api/import-export/supported-formats/enterprise
 */
export function useSupportedFormats() {
  return useQuery<SupportedFormats, Error>({
    queryKey: ['supported-formats'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/supported-formats/enterprise');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // Considera stale dopo 10 minuti
  });
}

/**
 * ✅ VERIFICATO: Preset di export
 * Endpoint: GET /api/import-export/export/presets
 */
export function useExportPresets() {
  return useQuery<ExportPreset[], Error>({
    queryKey: ['export-presets'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/export/presets');
      return response.data;
    },
    staleTime: 15 * 60 * 1000, // Considera stale dopo 15 minuti
  });
}

/**
 * ✅ VERIFICATO: Metriche import
 * Endpoint: GET /api/import-export/metrics/import
 */
export function useImportMetrics() {
  return useQuery<ImportMetrics, Error>({
    queryKey: ['import-metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/metrics/import');
      return response.data;
    },
    refetchInterval: 5 * 60 * 1000, // Aggiorna ogni 5 minuti
  });
}

/**
 * ✅ VERIFICATO: Stato operazioni in corso
 * Endpoint: GET /api/import-export/status/operations
 */
export function useOperationStatus() {
  return useQuery<OperationStatus, Error>({
    queryKey: ['operation-status'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/status/operations');
      return response.data;
    },
    refetchInterval: 10 * 1000, // Aggiorna ogni 10 secondi per operazioni in tempo reale
  });
}

/**
 * ✅ VERIFICATO: Configurazione import/export
 * Endpoint: GET /api/import-export/config
 */
export function useImportExportConfig() {
  return useQuery<any, Error>({
    queryKey: ['import-export-config'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/config');
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // Considera stale dopo 30 minuti
  });
}

/**
 * ✅ VERIFICATO: Aggiornamento configurazione
 * Endpoint: POST /api/import-export/config
 */
export function useUpdateImportExportConfig() {
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, Record<string, any>>({
    mutationFn: async (config) => {
      const response = await apiClient.post('/import-export/config', config);
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

// ===== DEBUG AND MONITORING HOOKS (VERIFICATI) =====

/**
 * ✅ VERIFICATO: Errori recenti
 * Endpoint: GET /api/import-export/debug/recent-errors
 */
export function useRecentImportErrors() {
  return useQuery<any, Error>({
    queryKey: ['recent-import-errors'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/debug/recent-errors');
      return response.data;
    },
    refetchInterval: 2 * 60 * 1000, // Aggiorna ogni 2 minuti
  });
}

/**
 * ✅ VERIFICATO: Retry operazione fallita
 * Endpoint: POST /api/import-export/debug/retry-failed/{operation_id}
 */
export function useRetryFailedOperation() {
  const queryClient = useQueryClient();
  
  return useMutation<any, Error, string>({
    mutationFn: async (operationId: string) => {
      const response = await apiClient.post(`/import-export/debug/retry-failed/${operationId}`);
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
 * ✅ VERIFICATO: Informazioni sistema import/export
 * Endpoint: GET /api/import-export/info
 */
export function useImportExportInfo() {
  return useQuery<any, Error>({
    queryKey: ['import-export-info'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/info');
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // Considera stale dopo 1 ora
  });
}

/**
 * ✅ NUOVO: Storico import/export
 * Endpoint: GET /api/sync/history
 */
export function useImportHistory(limit: number = 20) {
  return useQuery<ImportHistoryItem[], Error>({
    queryKey: ['import-history', limit],
    queryFn: async () => {
      const response = await apiClient.getImportHistory(limit);
      return response.data || [];
    },
    refetchInterval: 5 * 60 * 1000, // Aggiorna ogni 5 minuti
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
    queryClient.invalidateQueries({ queryKey: ['import-export-health'] });
    queryClient.invalidateQueries({ queryKey: ['import-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['operation-status'] });
    queryClient.invalidateQueries({ queryKey: ['recent-import-errors'] });
    queryClient.invalidateQueries({ queryKey: ['export-presets'] });
    queryClient.invalidateQueries({ queryKey: ['supported-formats'] });
    queryClient.invalidateQueries({ queryKey: ['import-export-config'] });
    queryClient.invalidateQueries({ queryKey: ['import-history'] });
    toast.info('Cache Aggiornata', { description: 'Tutti i dati import/export sono stati ricaricati' });
  };
}

/**
 * ✅ UTILITY: Hook per gestire upload di file con progress
 */
export function useFileUploadWithProgress() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (
    file: File, 
    endpoint: string, 
    onSuccess?: (result: any) => void,
    onError?: (error: Error) => void
  ) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simula il progresso per ora (in futuro si può implementare con XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiClient.post(endpoint, formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      if (onSuccess) onSuccess(response);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);

    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      if (onError) onError(error as Error);
    }
  };

  return {
    uploadFile,
    uploadProgress,
    isUploading
  };
}

/**
 * ✅ UTILITY: Hook per gestire validazione file prima dell'upload
 */
export function useFileValidation() {
  const validateFile = (file: File, options: {
    maxSize?: number; // in MB
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}) => {
    const errors: string[] = [];
    
    // Validazione dimensione
    if (options.maxSize && file.size > options.maxSize * 1024 * 1024) {
      errors.push(`Il file è troppo grande. Massimo ${options.maxSize}MB consentiti.`);
    }
    
    // Validazione tipo MIME
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push(`Tipo di file non supportato. Tipi consentiti: ${options.allowedTypes.join(', ')}`);
    }
    
    // Validazione estensione
    if (options.allowedExtensions) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !options.allowedExtensions.includes(`.${fileExtension}`)) {
        errors.push(`Estensione non supportata. Estensioni consentite: ${options.allowedExtensions.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateMultipleFiles = (files: File[], options: Parameters<typeof validateFile>[1]) => {
    const results = files.map(file => ({
      file,
      ...validateFile(file, options)
    }));
    
    const validFiles = results.filter(r => r.isValid).map(r => r.file);
    const invalidFiles = results.filter(r => !r.isValid);
    
    return {
      validFiles,
      invalidFiles,
      allValid: invalidFiles.length === 0
    };
  };

  return {
    validateFile,
    validateMultipleFiles
  };
}

/**
 * ✅ UTILITY: Hook per monitoraggio stato operazioni in tempo reale
 */
export function useOperationMonitor(operationId?: string) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const { data: operationStatus, refetch } = useQuery({
    queryKey: ['operation-monitor', operationId],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/status/operations');
      if (operationId) {
        return response.data.active_operations?.find((op: any) => op.id === operationId);
      }
      return response.data;
    },
    enabled: isMonitoring && !!operationId,
    refetchInterval: 2000, // Ogni 2 secondi quando attivo
  });

  const startMonitoring = () => setIsMonitoring(true);
  const stopMonitoring = () => setIsMonitoring(false);

  // Auto-stop quando operazione completata
  React.useEffect(() => {
    if (operationStatus?.status === 'completed' || operationStatus?.status === 'failed') {
      setIsMonitoring(false);
    }
  }, [operationStatus]);

  return {
    operationStatus,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refreshStatus: refetch
  };
}

/**
 * ✅ UTILITY: Hook per gestire drag & drop file
 */
export function useFileDragDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, onFilesDrop?: (files: File[]) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    setDraggedFiles(files);
    
    if (onFilesDrop) {
      onFilesDrop(files);
    }
  };

  const clearFiles = () => {
    setDraggedFiles([]);
  };

  return {
    isDragging,
    draggedFiles,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    clearFiles
  };
}

/**
 * ✅ UTILITY: Hook per gestire batch di operazioni con progress
 */
export function useBatchOperationProgress() {
  const [operations, setOperations] = useState<Array<{
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    message?: string;
  }>>([]);

  const addOperation = (id: string, message?: string) => {
    setOperations(prev => [...prev, {
      id,
      status: 'pending',
      progress: 0,
      message
    }]);
  };

  const updateOperation = (id: string, updates: Partial<typeof operations[0]>) => {
    setOperations(prev => prev.map(op => 
      op.id === id ? { ...op, ...updates } : op
    ));
  };

  const removeOperation = (id: string) => {
    setOperations(prev => prev.filter(op => op.id !== id));
  };

  const clearAll = () => {
    setOperations([]);
  };

  const getOverallProgress = () => {
    if (operations.length === 0) return 0;
    const totalProgress = operations.reduce((sum, op) => sum + op.progress, 0);
    return Math.round(totalProgress / operations.length);
  };

  const isAnyRunning = () => {
    return operations.some(op => op.status === 'running');
  };

  return {
    operations,
    addOperation,
    updateOperation,
    removeOperation,
    clearAll,
    getOverallProgress,
    isAnyRunning
  };
}

/**
 * ✅ UTILITY: Hook per gestire notifiche import/export
 */
export function useImportExportNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }>>([]);

  const addNotification = (notification: Omit<typeof notifications[0], 'id' | 'timestamp' | 'read'>) => {
    const newNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Mantieni solo le ultime 50
    
    // Auto-remove dopo 5 secondi per successi, 10 per errori
    const timeout = notification.type === 'success' ? 5000 : 10000;
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, timeout);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getUnreadCount = () => {
    return notifications.filter(notif => !notif.read).length;
  };

  return {
    notifications,
    addNotification,
    markAsRead,
    removeNotification,
    clearAll,
    getUnreadCount
  };
}

// ===== EXPORT DEFAULT OBJECT CON TUTTI GLI HOOK =====

const useImportExportHooks = {
  // Core Import
  useImportInvoicesZIP,
  useImportTransactionsCSVZIP,
  useImportMixedZIP,
  useImportInvoicesXML,
  
  // Validation
  useValidateZIPArchive,
  useValidateCSV,
  usePreviewCSV,
  useBatchValidateFiles,
  
  // Export
  useExportData,
  
  // Templates
  useDownloadTransactionTemplate,
  useDownloadTemplate,
  
  // System Management
  useCreateBackup,
  useCleanupTempFiles,
  
  // Advanced Features
  useSmartImportWithAI,
  useBulkImportData,
  
  // Data Queries
  useImportStatistics,
  useImportExportHealth,
  useSupportedFormats,
  useExportPresets,
  useImportMetrics,
  useOperationStatus,
  useImportExportConfig,
  useUpdateImportExportConfig,
  useImportHistory,
  
  // Debug & Monitoring
  useRecentImportErrors,
  useRetryFailedOperation,
  useImportExportInfo,
  
  // Utilities
  useImportExportStatus,
  useRefreshImportExportData,
  useFileUploadWithProgress,
  useFileValidation,
  useOperationMonitor,
  useFileDragDrop,
  useBatchOperationProgress,
  useImportExportNotifications
};

export default useImportExportHooks;
