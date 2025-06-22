// hooks/useImportExport.ts - ENHANCED VERSION WITH ZIP SUPPORT
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';
import { toast } from 'sonner';

// ================== ENHANCED TYPES FOR ENTERPRISE FUNCTIONALITY ==================

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

export interface BatchZIPValidationSummary {
    total_files: number;
    valid_files: number;
    invalid_files: number;
    error_files: number;
    validation_success_rate: number;
    can_proceed: boolean;
}

export interface BatchZIPValidationResult {
  summary: BatchZIPValidationSummary;
  validation_results: Array<{
    filename: string;
    validation_status: string;
    can_import: boolean;
    file_count?: number;
    size_mb?: number;
    errors_count?: number;
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
}

export interface SupportedFormats {
    import_formats: any;
    enterprise_features: any;
    limits_and_constraints: any;
}

// ================== CORE IMPORT/EXPORT HOOKS (WITH ZIP SUPPORT) ==================

// HOOK NUOVO: Importazione di un archivio ZIP di fatture
export function useImportInvoicesZIP() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/invoices/zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.success) throw new Error(response.message || 'Errore importazione ZIP fatture');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Importazione ZIP Fatture Completata', {
        description: `${data.success} fatture importate con successo. Errori: ${data.errors}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
    },
    onError: (error) => {
      toast.error('Errore Importazione ZIP', { description: error.message });
    },
  });
}

// HOOK NUOVO: Importazione di un archivio ZIP di transazioni CSV
export function useImportTransactionsCSVZIP() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/transactions/csv-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.success) throw new Error(response.message || 'Errore importazione ZIP transazioni');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Importazione ZIP Transazioni Completata', {
        description: `${data.success} transazioni importate. Errori: ${data.errors}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
    },
    onError: (error) => {
      toast.error('Errore Importazione ZIP', { description: error.message });
    },
  });
}

// HOOK NUOVO: Importazione di un archivio ZIP misto (fatture + transazioni)
export function useImportMixedZIP() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/mixed/zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.success) throw new Error(response.message || 'Errore importazione ZIP misto');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Importazione ZIP Misto Completata', {
        description: `${data.success} elementi importati con successo.`,
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
    },
    onError: (error) => {
      toast.error('Errore Importazione Mista', { description: error.message });
    },
  });
}

// HOOK MANTENUTO: Importazione di file XML/P7M singoli
export function useImportInvoicesXML() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File[]>({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const response = await apiClient.post('/import-export/invoices/xml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.success) throw new Error(response.message || 'Errore importazione fatture');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Importazione Fatture Completata', {
        description: `${data.success} fatture importate. Errori: ${data.errors}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
    },
    onError: (error) => {
      toast.error('Errore Importazione Fatture', { description: error.message });
    },
  });
}

// ================== VALIDATION & UTILITY HOOKS ==================

// HOOK NUOVO: Validazione di un singolo archivio ZIP
export function useValidateZIPArchive() {
  return useMutation<APIResponse<ZIPValidationResult>, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/import-export/validate/zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.success) throw new Error(response.message || 'Errore validazione ZIP');
      return response;
    },
    onSuccess: (response) => {
      if (response.data?.validation_status === 'valid') {
        toast.info('Validazione ZIP', { description: `L'archivio è valido e contiene ${response.data.validation_details.file_count} file.` });
      } else {
        toast.warning('Validazione ZIP', { description: `L'archivio contiene ${response.data?.validation_details.errors.length} errori.` });
      }
    },
    onError: (error) => {
      toast.error('Errore Validazione ZIP', { description: error.message });
    },
  });
}

// HOOK NUOVO: Validazione di più archivi ZIP in batch
export function useValidateBatchZIP() {
    return useMutation<APIResponse<BatchZIPValidationResult>, Error, File[]>({
      mutationFn: async (files: File[]) => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        const response = await apiClient.post('/import-export/validate/batch-zip', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (!response.success) throw new Error(response.message || 'Errore validazione batch');
        return response;
      },
    });
}

// HOOK MANTENUTO: Scarica il template CSV per le transazioni
export function useDownloadTransactionTemplate() {
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const response = await apiClient.get('/import-export/templates/transactions-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_transazioni.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    },
    onError: (error) => {
      toast.error('Download Template Fallito', { description: error.message });
    },
  });
}

// ================== EXPORT & SYSTEM HOOKS ==================

// HOOK MANTENUTO: Esportazione generica dei dati
export function useExportData() {
  return useMutation<void, Error, {
    type: 'invoices' | 'transactions' | 'anagraphics' | 'reconciliation-report';
    format: 'excel' | 'csv' | 'json';
    filters?: Record<string, any>;
    includeDetails?: boolean;
  }>({
    mutationFn: async ({ type, format, ...options }) => {
        // Logica per costruire l'URL con i parametri e avviare il download
        const params = new URLSearchParams({ format, ...options.filters, include_details: String(!!options.includeDetails) });
        const response = await apiClient.get(`/import-export/export/${type}?${params.toString()}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${type}_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    },
    onSuccess: () => {
        toast.success('Esportazione Avviata', { description: 'Il download del file inizierà a breve.' });
    },
    onError: (error) => {
      toast.error('Esportazione Fallita', { description: error.message });
    },
  });
}

// HOOK NUOVO: Esportazione ZIP (esempio per le fatture)
export function useExportInvoicesAsZIP() {
    return useMutation<void, Error, {
        format: 'excel' | 'csv';
        filters?: Record<string, any>;
        split_by_type?: boolean;
    }>({
        mutationFn: async (options) => {
            const params = new URLSearchParams(options as any);
            const response = await apiClient.get(`/import-export/export/invoices/zip?${params.toString()}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `fatture_export_${new Date().toISOString().split('T')[0]}.zip`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        },
    });
}

// ================== DATA & STATUS QUERIES ==================

// HOOK MANTENUTO: Cronologia importazioni
export function useImportHistory(limit: number = 20) {
  return useQuery<ImportHistory[], Error>({
    queryKey: ['import-history', limit],
    queryFn: async () => {
      const response = await apiClient.get(`/import-export/history?limit=${limit}`);
      return response.data;
    },
  });
}

// HOOK MANTENUTO: Statistiche di importazione
export function useImportStatistics() {
  return useQuery<ImportStatistics, Error>({
    queryKey: ['import-statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/statistics');
      return response.data;
    },
  });
}

// HOOK NUOVO: Stato di salute del sistema di importazione
export function useImportExportHealth() {
  return useQuery<ImportExportHealth, Error>({
    queryKey: ['import-export-health'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/health/enterprise');
      return response.data;
    },
    refetchInterval: 60000, // Controlla lo stato ogni minuto
  });
}

// HOOK NUOVO: Formati supportati
export function useSupportedFormats() {
    return useQuery<SupportedFormats, Error>({
        queryKey: ['supported-formats'],
        queryFn: async () => {
            const response = await apiClient.get('/import-export/supported-formats/enterprise');
            return response.data;
        },
        staleTime: Infinity, // I formati non cambiano spesso
    });
}

// ================== MAINTENANCE HOOKS ==================

// HOOK MANTENUTO: Backup del database
export function useCreateBackup() {
  return useMutation<any, Error, void>({
    mutationFn: () => apiClient.post('/system/backup/create'),
    onSuccess: () => toast.success('Backup del sistema creato con successo.'),
    onError: (error) => toast.error('Creazione Backup Fallita', { description: error.message }),
  });
}

// HOOK NUOVO: Pulizia storage temporaneo
export function useCleanupTempFiles() {
  return useMutation<any, Error, void>({
    mutationFn: () => apiClient.post('/import-export/maintenance/optimize-temp-storage'),
    onSuccess: (response) => toast.success('Pulizia completata', { description: `Liberati ${response.data.space_freed_mb}MB.` }),
    onError: (error) => toast.error('Pulizia Fallita', { description: error.message }),
  });
}

// HOOK AGGIUNTO: Preset di esportazione (ipotizzando un endpoint)
export function useExportPresets() {
    return useQuery<any[], Error>({
        queryKey: ['export-presets'],
        queryFn: async () => {
            const response = await apiClient.get('/import-export/export/presets');
            return response.data;
        },
    });
}
