/**
 * Import/Export Hooks V4.1 - CORRECTED
 * Fix per React warning "Cannot update component while rendering"
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api';
import { useDataStore, useUIStore } from '@/store';

// ===== QUERY KEYS =====
export const IMPORT_EXPORT_QUERY_KEYS = {
  IMPORT_STATUS: ['import-status'] as const,
  EXPORT_PRESETS: ['export-presets'] as const,
  IMPORT_HISTORY: ['import-history'] as const,
  TEMPLATES: ['templates'] as const,
  SUPPORTED_FORMATS: ['supported-formats'] as const,
} as const;

// ===== IMPORT INVOICES ZIP =====
export function useImportInvoicesZIP() {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.importInvoicesXML([file]);
      return result;
    },
    onSuccess: (data) => {
      // ✅ FIX: Delay toast per evitare warning
      setTimeout(() => {
        if (data.success) {
          toast.success('Importazione ZIP Fatture Completata', {
            duration: 4000,
          });
          
          addNotification({
            type: 'success',
            title: 'Import Completato',
            message: `Processati: ${data.processed || 0}, Successi: ${data.success || 0}`,
          });
        } else {
          toast.error('Errore durante importazione ZIP');
        }
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      // ✅ FIX: Delay anche per errori
      setTimeout(() => {
        toast.error('Errore importazione ZIP fatture');
      }, 0);
      
      console.error('Import ZIP failed:', error);
    },
  });
}

// ===== IMPORT TRANSACTIONS CSV =====
export function useImportTransactionsCSV() {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.importTransactionsCSV(file);
      return result;
    },
    onSuccess: (data) => {
      // ✅ FIX: Delay toast per evitare warning
      setTimeout(() => {
        if (data.success) {
          toast.success('Importazione CSV Transazioni Completata');
          
          addNotification({
            type: 'success',
            title: 'Import CSV Completato',
            message: `Importate ${data.processed || 0} transazioni`,
          });
        }
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      setTimeout(() => {
        toast.error('Errore importazione CSV transazioni');
      }, 0);
      
      console.error('Import CSV failed:', error);
    },
  });
}

// ===== VALIDATE FILES =====
export function useValidateInvoiceFiles() {
  return useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const result = await apiClient.validateInvoiceFiles(files);
      return result;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        if (data.success) {
          toast.success('File validati con successo');
        } else {
          toast.warning('Alcuni file hanno problemi di validazione');
        }
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore validazione file');
      }, 0);
    },
  });
}

export function useValidateTransactionsCSV() {
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.validateTransactionsCSV(file);
      return result;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        if (data.success) {
          toast.success('CSV validato con successo');
        }
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore validazione CSV');
      }, 0);
    },
  });
}

// ===== PREVIEW CSV =====
export function usePreviewTransactionsCSV() {
  return useMutation({
    mutationFn: async ({ file, maxRows = 10 }: { file: File; maxRows?: number }) => {
      const result = await apiClient.previewTransactionsCSV(file, maxRows);
      return result;
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore preview CSV');
      }, 0);
    },
  });
}

// ===== EXPORT DATA =====
export function useExportData() {
  return useMutation({
    mutationFn: async ({
      dataType,
      format = 'excel',
      filters = {}
    }: {
      dataType: 'invoices' | 'transactions' | 'anagraphics';
      format?: 'csv' | 'excel' | 'json';
      filters?: Record<string, any>;
    }) => {
      const result = await apiClient.exportData(dataType, format, filters);
      return result;
    },
    onSuccess: () => {
      setTimeout(() => {
        toast.success('Export completato');
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore durante export');
      }, 0);
    },
  });
}

// ===== BULK IMPORT =====
export function useBulkImportData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      dataType,
      file,
      options = {}
    }: {
      dataType: 'invoices' | 'transactions' | 'anagraphics';
      file: File;
      options?: Record<string, any>;
    }) => {
      const result = await apiClient.bulkImportData(dataType, file, options);
      return result;
    },
    onSuccess: (data, variables) => {
      setTimeout(() => {
        if (data.success) {
          toast.success(`Import bulk ${variables.dataType} completato`);
        }
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: [variables.dataType] });
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore import bulk');
      }, 0);
    },
  });
}

// ===== QUERY HOOKS =====

export function useExportPresets() {
  return useQuery({
    queryKey: IMPORT_EXPORT_QUERY_KEYS.EXPORT_PRESETS,
    queryFn: () => apiClient.getExportPresets(),
    staleTime: 300000, // 5 minutes
    retry: 1,
    onError: () => {
      // Non mostrare toast per query, solo log
      console.warn('Export presets not available');
    },
  });
}

export function useImportHistory(limit = 20) {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.IMPORT_HISTORY, limit],
    queryFn: () => apiClient.getImportHistory(limit),
    staleTime: 120000, // 2 minutes
    retry: 1,
  });
}

export function useImportTemplate(dataType: 'invoices' | 'transactions' | 'anagraphics') {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.TEMPLATES, dataType],
    queryFn: () => apiClient.getImportTemplate(dataType),
    staleTime: 600000, // 10 minutes
    enabled: !!dataType,
    retry: 1,
  });
}

export function useSupportedFormats() {
  return useQuery({
    queryKey: IMPORT_EXPORT_QUERY_KEYS.SUPPORTED_FORMATS,
    queryFn: () => apiClient.getSupportedFormats(),
    staleTime: 600000, // 10 minutes
    retry: 1,
  });
}

export function useImportStatistics() {
  return useQuery({
    queryKey: ['import-statistics'],
    queryFn: () => apiClient.getImportStatistics(),
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}

export function useImportExportHealth() {
  return useQuery({
    queryKey: ['import-export-health'],
    queryFn: () => apiClient.getImportExportHealth(),
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}

// ===== IMPORT STATUS TRACKING =====
export function useImportStatus(importId: string) {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.IMPORT_STATUS, importId],
    queryFn: () => apiClient.getImportStatus(importId),
    enabled: !!importId,
    refetchInterval: 2000, // Poll ogni 2 secondi per status live
    retry: 1,
  });
}

// ===== TEMPLATE DOWNLOAD =====
export function useDownloadTemplate() {
  return useMutation({
    mutationFn: async (templateType: 'transactions' | 'anagraphics') => {
      if (templateType === 'transactions') {
        const blob = await apiClient.downloadTransactionTemplate();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_transazioni.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        return { success: true, message: 'Template scaricato' };
      }
      throw new Error('Template type not supported');
    },
    onSuccess: () => {
      setTimeout(() => {
        toast.success('Template scaricato con successo');
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore download template');
      }, 0);
    },
  });
}

// ===== ZIP VALIDATION =====
export function useValidateZIP() {
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.validateZIPArchive(file);
      return result;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        if (data.success && data.data?.can_import) {
          toast.success('File ZIP validato con successo');
        } else {
          toast.warning('ZIP contiene errori di validazione');
        }
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore validazione ZIP');
      }, 0);
    },
  });
}

// ===== BATCH OPERATIONS =====
export function useBatchImport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (files: File[]) => {
      const results = await Promise.allSettled(
        files.map(file => {
          if (file.name.toLowerCase().endsWith('.zip')) {
            return apiClient.importInvoicesXML([file]);
          } else if (file.name.toLowerCase().endsWith('.csv')) {
            return apiClient.importTransactionsCSV(file);
          }
          throw new Error(`Unsupported file type: ${file.name}`);
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      return { successful, failed, total: files.length, results };
    },
    onSuccess: (data) => {
      setTimeout(() => {
        toast.success(`Batch import: ${data.successful}/${data.total} file processati`);
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore batch import');
      }, 0);
    },
  });
}

// ===== COMBINED OPERATIONS =====
export function useImportExportOperations() {
  const importInvoicesZIP = useImportInvoicesZIP();
  const importTransactionsCSV = useImportTransactionsCSV();
  const validateFiles = useValidateInvoiceFiles();
  const exportData = useExportData();
  const downloadTemplate = useDownloadTemplate();
  
  return {
    // Import operations
    importInvoicesZIP,
    importTransactionsCSV,
    
    // Validation
    validateFiles,
    
    // Export operations
    exportData,
    downloadTemplate,
    
    // Status checks
    isLoading: importInvoicesZIP.isPending || 
               importTransactionsCSV.isPending || 
               validateFiles.isPending || 
               exportData.isPending ||
               downloadTemplate.isPending,
               
    hasError: importInvoicesZIP.isError || 
              importTransactionsCSV.isError || 
              validateFiles.isError || 
              exportData.isError ||
              downloadTemplate.isError,
  };
}

// ===== DEFAULT EXPORT =====
export default useImportExportOperations;/**
 * Import/Export Hooks V4.1 - CORRECTED
 * Fix per React warning "Cannot update component while rendering"
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api';
import { useDataStore, useUIStore } from '@/store';

// ===== QUERY KEYS =====
export const IMPORT_EXPORT_QUERY_KEYS = {
  IMPORT_STATUS: ['import-status'] as const,
  EXPORT_PRESETS: ['export-presets'] as const,
  IMPORT_HISTORY: ['import-history'] as const,
  TEMPLATES: ['templates'] as const,
  SUPPORTED_FORMATS: ['supported-formats'] as const,
} as const;

// ===== IMPORT INVOICES ZIP =====
export function useImportInvoicesZIP() {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.importInvoicesXML([file]);
      return result;
    },
    onSuccess: (data) => {
      // ✅ FIX: Delay toast per evitare warning
      setTimeout(() => {
        if (data.success) {
          toast.success('Importazione ZIP Fatture Completata', {
            duration: 4000,
          });
          
          addNotification({
            type: 'success',
            title: 'Import Completato',
            message: `Processati: ${data.processed || 0}, Successi: ${data.success || 0}`,
          });
        } else {
          toast.error('Errore durante importazione ZIP');
        }
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      // ✅ FIX: Delay anche per errori
      setTimeout(() => {
        toast.error('Errore importazione ZIP fatture');
      }, 0);
      
      console.error('Import ZIP failed:', error);
    },
  });
}

// ===== IMPORT TRANSACTIONS CSV =====
export function useImportTransactionsCSV() {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.importTransactionsCSV(file);
      return result;
    },
    onSuccess: (data) => {
      // ✅ FIX: Delay toast per evitare warning
      setTimeout(() => {
        if (data.success) {
          toast.success('Importazione CSV Transazioni Completata');
          
          addNotification({
            type: 'success',
            title: 'Import CSV Completato',
            message: `Importate ${data.processed || 0} transazioni`,
          });
        }
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      setTimeout(() => {
        toast.error('Errore importazione CSV transazioni');
      }, 0);
      
      console.error('Import CSV failed:', error);
    },
  });
}

// ===== VALIDATE FILES =====
export function useValidateInvoiceFiles() {
  return useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const result = await apiClient.validateInvoiceFiles(files);
      return result;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        if (data.success) {
          toast.success('File validati con successo');
        } else {
          toast.warning('Alcuni file hanno problemi di validazione');
        }
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore validazione file');
      }, 0);
    },
  });
}

export function useValidateTransactionsCSV() {
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.validateTransactionsCSV(file);
      return result;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        if (data.success) {
          toast.success('CSV validato con successo');
        }
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore validazione CSV');
      }, 0);
    },
  });
}

// ===== PREVIEW CSV =====
export function usePreviewTransactionsCSV() {
  return useMutation({
    mutationFn: async ({ file, maxRows = 10 }: { file: File; maxRows?: number }) => {
      const result = await apiClient.previewTransactionsCSV(file, maxRows);
      return result;
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore preview CSV');
      }, 0);
    },
  });
}

// ===== EXPORT DATA =====
export function useExportData() {
  return useMutation({
    mutationFn: async ({
      dataType,
      format = 'excel',
      filters = {}
    }: {
      dataType: 'invoices' | 'transactions' | 'anagraphics';
      format?: 'csv' | 'excel' | 'json';
      filters?: Record<string, any>;
    }) => {
      const result = await apiClient.exportData(dataType, format, filters);
      return result;
    },
    onSuccess: () => {
      setTimeout(() => {
        toast.success('Export completato');
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore durante export');
      }, 0);
    },
  });
}

// ===== BULK IMPORT =====
export function useBulkImportData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      dataType,
      file,
      options = {}
    }: {
      dataType: 'invoices' | 'transactions' | 'anagraphics';
      file: File;
      options?: Record<string, any>;
    }) => {
      const result = await apiClient.bulkImportData(dataType, file, options);
      return result;
    },
    onSuccess: (data, variables) => {
      setTimeout(() => {
        if (data.success) {
          toast.success(`Import bulk ${variables.dataType} completato`);
        }
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: [variables.dataType] });
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore import bulk');
      }, 0);
    },
  });
}

// ===== QUERY HOOKS =====

export function useExportPresets() {
  return useQuery({
    queryKey: IMPORT_EXPORT_QUERY_KEYS.EXPORT_PRESETS,
    queryFn: () => apiClient.getExportPresets(),
    staleTime: 300000, // 5 minutes
    retry: 1,
    onError: () => {
      // Non mostrare toast per query, solo log
      console.warn('Export presets not available');
    },
  });
}

export function useImportHistory(limit = 20) {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.IMPORT_HISTORY, limit],
    queryFn: () => apiClient.getImportHistory(limit),
    staleTime: 120000, // 2 minutes
    retry: 1,
  });
}

export function useImportTemplate(dataType: 'invoices' | 'transactions' | 'anagraphics') {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.TEMPLATES, dataType],
    queryFn: () => apiClient.getImportTemplate(dataType),
    staleTime: 600000, // 10 minutes
    enabled: !!dataType,
    retry: 1,
  });
}

export function useSupportedFormats() {
  return useQuery({
    queryKey: IMPORT_EXPORT_QUERY_KEYS.SUPPORTED_FORMATS,
    queryFn: () => apiClient.getSupportedFormats(),
    staleTime: 600000, // 10 minutes
    retry: 1,
  });
}

export function useImportStatistics() {
  return useQuery({
    queryKey: ['import-statistics'],
    queryFn: () => apiClient.getImportStatistics(),
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}

export function useImportExportHealth() {
  return useQuery({
    queryKey: ['import-export-health'],
    queryFn: () => apiClient.getImportExportHealth(),
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}

// ===== IMPORT STATUS TRACKING =====
export function useImportStatus(importId: string) {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.IMPORT_STATUS, importId],
    queryFn: () => apiClient.getImportStatus(importId),
    enabled: !!importId,
    refetchInterval: 2000, // Poll ogni 2 secondi per status live
    retry: 1,
  });
}

// ===== TEMPLATE DOWNLOAD =====
export function useDownloadTemplate() {
  return useMutation({
    mutationFn: async (templateType: 'transactions' | 'anagraphics') => {
      if (templateType === 'transactions') {
        const blob = await apiClient.downloadTransactionTemplate();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_transazioni.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        return { success: true, message: 'Template scaricato' };
      }
      throw new Error('Template type not supported');
    },
    onSuccess: () => {
      setTimeout(() => {
        toast.success('Template scaricato con successo');
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore download template');
      }, 0);
    },
  });
}

// ===== ZIP VALIDATION =====
export function useValidateZIP() {
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.validateZIPArchive(file);
      return result;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        if (data.success && data.data?.can_import) {
          toast.success('File ZIP validato con successo');
        } else {
          toast.warning('ZIP contiene errori di validazione');
        }
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore validazione ZIP');
      }, 0);
    },
  });
}

// ===== BATCH OPERATIONS =====
export function useBatchImport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (files: File[]) => {
      const results = await Promise.allSettled(
        files.map(file => {
          if (file.name.toLowerCase().endsWith('.zip')) {
            return apiClient.importInvoicesXML([file]);
          } else if (file.name.toLowerCase().endsWith('.csv')) {
            return apiClient.importTransactionsCSV(file);
          }
          throw new Error(`Unsupported file type: ${file.name}`);
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      return { successful, failed, total: files.length, results };
    },
    onSuccess: (data) => {
      setTimeout(() => {
        toast.success(`Batch import: ${data.successful}/${data.total} file processati`);
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore batch import');
      }, 0);
    },
  });
}

// ===== COMBINED OPERATIONS =====
export function useImportExportOperations() {
  const importInvoicesZIP = useImportInvoicesZIP();
  const importTransactionsCSV = useImportTransactionsCSV();
  const validateFiles = useValidateInvoiceFiles();
  const exportData = useExportData();
  const downloadTemplate = useDownloadTemplate();
  
  return {
    // Import operations
    importInvoicesZIP,
    importTransactionsCSV,
    
    // Validation
    validateFiles,
    
    // Export operations
    exportData,
    downloadTemplate,
    
    // Status checks
    isLoading: importInvoicesZIP.isPending || 
               importTransactionsCSV.isPending || 
               validateFiles.isPending || 
               exportData.isPending ||
               downloadTemplate.isPending,
               
    hasError: importInvoicesZIP.isError || 
              importTransactionsCSV.isError || 
              validateFiles.isError || 
              exportData.isError ||
              downloadTemplate.isError,
  };
}

// ===== DEFAULT EXPORT =====
export default useImportExportOperations;
