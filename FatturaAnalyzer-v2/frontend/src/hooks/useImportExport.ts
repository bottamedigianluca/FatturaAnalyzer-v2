import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';
import { toast } from 'sonner';

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
}
export interface SupportedFormats {
    import_formats: any;
    enterprise_features: any;
    limits_and_constraints: any;
}


export function useImportInvoicesZIP() {
  const queryClient = useQueryClient();
  return useMutation<APIResponse, Error, File>({
    mutationFn: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('/api/import-export/invoices/zip', formData)
    },
    onSuccess: (data) => {
      toast.success('Importazione ZIP Fatture Completata');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => toast.error('Errore Importazione ZIP', { description: error.message }),
  });
}


export function useImportTransactionsCSVZIP() {
  const queryClient = useQueryClient();
  return useMutation<APIResponse, Error, File>({
    mutationFn: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('/api/import-export/transactions/csv-zip', formData)
    },
    onSuccess: (data) => {
      toast.success('Importazione ZIP Transazioni Completata');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => toast.error('Errore Importazione ZIP', { description: error.message }),
  });
}

export function useImportMixedZIP() {
  const queryClient = useQueryClient();
  return useMutation<APIResponse, Error, File>({
    mutationFn: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('/api/import-export/mixed/zip', formData)
    },
    onSuccess: (data) => {
      toast.success('Importazione ZIP Misto Completata');
      queryClient.invalidateQueries({ queryKey: ['invoices', 'transactions'] });
    },
    onError: (error) => toast.error('Errore Importazione Mista', { description: error.message }),
  });
}

export function useImportInvoicesXML() {
  const queryClient = useQueryClient();
  return useMutation<APIResponse, Error, File[]>({
    mutationFn: (files: File[]) => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        return apiClient.post('/api/import-export/invoices/xml', formData);
    },
    onSuccess: (data) => {
      toast.success('Importazione Fatture Completata');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => toast.error('Errore Importazione Fatture', { description: error.message }),
  });
}

export function useValidateZIPArchive() {
    return useMutation<APIResponse<ZIPValidationResult>, Error, File>({
      mutationFn: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/api/import-export/validate-zip', formData);
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

export function useDownloadTransactionTemplate() {
    return useMutation<void, Error, void>({
      mutationFn: async () => {
        const response = await apiClient.get('/api/import-export/templates/transactions-csv', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response as any]));
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

export function useExportData() {
  return useMutation<void, Error, {
    type: 'invoices' | 'transactions' | 'anagraphics' | 'reconciliation-report';
    format: 'excel' | 'csv' | 'json';
    filters?: Record<string, any>;
    includeDetails?: boolean;
  }>({
    mutationFn: async ({ type, format, ...options }) => {
        const params = new URLSearchParams({ format, ...options.filters, include_details: String(!!options.includeDetails) });
        const response = await apiClient.get(`/api/import-export/export/${type}?${params.toString()}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response as any]));
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

export function useCreateBackup() {
    return useMutation<APIResponse, Error, void>({
        mutationFn: () => apiClient.post('/api/system/backup/create'),
        onSuccess: (data) => toast.success('Backup creato', { description: data.message }),
        onError: (error) => toast.error('Errore Backup', { description: error.message }),
    });
}

export function useCleanupTempFiles() {
    return useMutation<APIResponse, Error, void>({
        mutationFn: () => apiClient.post('/api/system/maintenance/cleanup'),
        onSuccess: (data) => toast.success('Pulizia completata', { description: data.message }),
        onError: (error) => toast.error('Errore Pulizia', { description: error.message }),
    });
}

// ---- HOOKS DISABILITATI (ENDPOINT NON TROVATI) ----

export function useImportHistory(limit: number = 20) {
  return useQuery<ImportHistory[], Error>({
    queryKey: ['import-history', limit],
    queryFn: async () => {
      // CORREZIONE: Questo endpoint esiste in sync.py
      const response = await apiClient.get(`/api/sync/history?limit=${limit}`);
      return response.data?.history || [];
    },
    enabled: true, // Abilitato perché l'endpoint è stato trovato
  });
}

export function useImportStatistics() {
  return useQuery<ImportStatistics, Error>({
    queryKey: ['import-statistics'],
    queryFn: async () => {
      console.warn("Hook 'useImportStatistics' disabilitato: endpoint '/api/import-export/statistics' non implementato.");
      return Promise.resolve({ invoices: { total_invoices: 0, last_30_days: 0 }, transactions: { total_transactions: 0, last_30_days: 0 }, last_updated: '' });
    },
    enabled: false,
  });
}

export function useImportExportHealth() {
  return useQuery<ImportExportHealth, Error>({
    queryKey: ['import-export-health'],
    queryFn: async () => {
      console.warn("Hook 'useImportExportHealth' disabilitato: endpoint '/api/import-export/health/enterprise' non implementato.");
      return Promise.resolve({ status: 'unknown', import_adapter: 'unknown', temp_storage: 'unknown' });
    },
    enabled: false,
  });
}

export function useSupportedFormats() {
  return useQuery<SupportedFormats, Error>({
    queryKey: ['supported-formats'],
    queryFn: async () => {
      console.warn("Hook 'useSupportedFormats' disabilitato: endpoint '/api/import-export/supported-formats/enterprise' non implementato.");
      return Promise.resolve({ import_formats: {}, enterprise_features: {}, limits_and_constraints: {} });
    },
    enabled: false,
  });
}

export function useExportPresets() {
  return useQuery<any, Error>({
    queryKey: ['export-presets'],
    queryFn: async () => {
      console.warn("Hook 'useExportPresets' disabilitato: endpoint '/api/import-export/export/presets' non implementato.");
      return Promise.resolve([]);
    },
    enabled: false,
  });
}
