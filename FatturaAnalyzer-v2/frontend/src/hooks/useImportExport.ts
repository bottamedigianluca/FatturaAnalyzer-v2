/**
 * Import/Export Hooks V4.1 - CORRECTED & COMPLETE
 * Fix per errori TypeScript: toast.warning e onError in useQuery
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
  CLEANUP_STATUS: ['cleanup-status'] as const,
  AUTO_CLEANUP: ['auto-cleanup'] as const,
  IMPORT_STATISTICS: ['import-statistics'] as const,
  EXPORT_QUEUE: ['export-queue'] as const,
} as const;

// ===== IMPORT HOOKS =====

/**
 * Hook per importare file ZIP di fatture
 */
export function useImportInvoicesZIP() {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.importInvoicesXML([file]);
      return result;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        if (data.success) {
          toast.success('Importazione ZIP Fatture Completata', {
            duration: 4000,
          });
          
          addNotification({
            type: 'success',
            title: 'Import Completato',
            message: `Processati: ${data.processed || 0}, Successi: ${data.imported || 0}`,
          });
        } else {
          toast.error('Errore durante importazione ZIP');
        }
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: IMPORT_EXPORT_QUERY_KEYS.IMPORT_HISTORY });
    },
    onError: (error) => {
      setTimeout(() => {
        toast.error('Errore importazione ZIP fatture');
      }, 0);
      
      console.error('Import ZIP failed:', error);
    },
  });
}

/**
 * Hook per importare file CSV di transazioni
 */
export function useImportTransactionsCSV() {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await apiClient.importTransactionsCSV(file);
      return result;
    },
    onSuccess: (data) => {
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
      queryClient.invalidateQueries({ queryKey: IMPORT_EXPORT_QUERY_KEYS.IMPORT_HISTORY });
    },
    onError: (error) => {
      setTimeout(() => {
        toast.error('Errore importazione CSV transazioni');
      }, 0);
      
      console.error('Import CSV failed:', error);
    },
  });
}

/**
 * Hook per import bulk di più tipi di dati
 */
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
      queryClient.invalidateQueries({ queryKey: IMPORT_EXPORT_QUERY_KEYS.IMPORT_HISTORY });
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore import bulk');
      }, 0);
    },
  });
}

/**
 * Hook per batch import di più file contemporaneamente
 */
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
      queryClient.invalidateQueries({ queryKey: IMPORT_EXPORT_QUERY_KEYS.IMPORT_HISTORY });
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore batch import');
      }, 0);
    },
  });
}

// ===== VALIDATION HOOKS =====

/**
 * Hook per validare file di fatture (ZIP/XML)
 */
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
          // ✅ FIX: Sostituito toast.warning con toast('message', { icon: '⚠️' })
          toast('Alcuni file hanno problemi di validazione', { 
            icon: '⚠️',
            duration: 4000
          });
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

/**
 * Hook per validare file CSV di transazioni
 */
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

/**
 * Hook per validare archivi ZIP
 */
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
          // ✅ FIX: Sostituito toast.warning con toast('message', { icon: '⚠️' })
          toast('ZIP contiene errori di validazione', { 
            icon: '⚠️',
            duration: 4000
          });
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

/**
 * Hook combinato per tutte le validazioni
 */
export function useFileValidation() {
  const validateZIP = useValidateZIP();
  const validateCSV = useValidateTransactionsCSV();
  const validateInvoices = useValidateInvoiceFiles();
  
  return {
    validateZIP,
    validateCSV,
    validateInvoices,
    isValidating: validateZIP.isPending || validateCSV.isPending || validateInvoices.isPending,
    validateFile: async (file: File) => {
      const extension = file.name.toLowerCase().split('.').pop();
      
      if (extension === 'zip') {
        return validateZIP.mutateAsync(file);
      } else if (extension === 'csv') {
        return validateCSV.mutateAsync(file);
      } else if (['xml', 'p7m'].includes(extension || '')) {
        return validateInvoices.mutateAsync([file]);
      } else {
        throw new Error(`Formato file non supportato: ${extension}`);
      }
    }
  };
}

// ===== PREVIEW HOOKS =====

/**
 * Hook per preview di file CSV
 */
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

// ===== EXPORT HOOKS =====

/**
 * Hook per export di dati
 */
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
      const blob = await apiClient.exportData(dataType, format, filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataType}_export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return { success: true, format, dataType };
    },
    onSuccess: (data) => {
      setTimeout(() => {
        toast.success(`Export ${data.dataType} completato (${data.format})`);
      }, 0);
    },
    onError: () => {
      setTimeout(() => {
        toast.error('Errore durante export');
      }, 0);
    },
  });
}

/**
 * Hook per export con preset personalizzati
 */
export function useExportWithPreset() {
  const exportData = useExportData();
  
  return useMutation({
    mutationFn: async (preset: {
      id: string;
      name: string;
      type: 'invoices' | 'transactions' | 'anagraphics';
      format: 'csv' | 'excel' | 'json';
      filters: Record<string, any>;
    }) => {
      return exportData.mutateAsync({
        dataType: preset.type,
        format: preset.format,
        filters: preset.filters
      });
    },
    onSuccess: () => {
      toast.success('Export con preset completato');
    },
    onError: () => {
      toast.error('Errore export con preset');
    }
  });
}

// ===== TEMPLATE HOOKS =====

/**
 * Hook per scaricare template
 */
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

// ===== CLEANUP HOOKS =====

/**
 * Hook per cleanup file temporanei - RICHIESTO DA ImportExportPage
 */
export function useCleanupTempFiles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (options: { 
      older_than_hours?: number; 
      file_types?: string[];
      force?: boolean;
    } = {}) => {
      const {
        older_than_hours = 24,
        file_types = ['csv', 'xml', 'zip'],
        force = false
      } = options;
      
      const result = await apiClient.cleanupTempFiles({
        older_than_hours,
        file_types,
        force
      });
      return result;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        if (data.success) {
          toast.success(`Cleanup completato: ${data.data?.cleaned_files || 0} file rimossi`);
        }
      }, 0);
      
      queryClient.invalidateQueries({ queryKey: IMPORT_EXPORT_QUERY_KEYS.IMPORT_HISTORY });
      queryClient.invalidateQueries({ queryKey: IMPORT_EXPORT_QUERY_KEYS.CLEANUP_STATUS });
    },
    onError: (error) => {
      setTimeout(() => {
        toast.error('Errore durante cleanup file temporanei');
      }, 0);
      
      console.error('Cleanup failed:', error);
    },
  });
}

/**
 * Hook per gestire auto-cleanup
 */
export function useAutoCleanup(enabled = true) {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.AUTO_CLEANUP, enabled],
    queryFn: async () => {
      if (!enabled) return { auto_cleanup_enabled: false };
      
      try {
        const result = await apiClient.getCleanupStatus();
        return result.data || result;
      } catch (error) {
        console.warn('Cleanup status not available:', error);
        return { 
          auto_cleanup_enabled: false, 
          last_cleanup: null,
          next_cleanup: null 
        };
      }
    },
    enabled,
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook per gestione completa cleanup
 */
export function useCleanupManagement() {
  const queryClient = useQueryClient();
  
  const enableAutoCleanup = useMutation({
    mutationFn: async (hours: number = 24) => {
      return await apiClient.enableAutoCleanup(hours);
    },
    onSuccess: () => {
      toast.success('Auto-cleanup abilitato');
      queryClient.invalidateQueries({ queryKey: IMPORT_EXPORT_QUERY_KEYS.AUTO_CLEANUP });
    },
    onError: () => {
      toast.error('Errore abilitazione auto-cleanup');
    }
  });
  
  const disableAutoCleanup = useMutation({
    mutationFn: async () => {
      return await apiClient.disableAutoCleanup();
    },
    onSuccess: () => {
      toast.success('Auto-cleanup disabilitato');
      queryClient.invalidateQueries({ queryKey: IMPORT_EXPORT_QUERY_KEYS.AUTO_CLEANUP });
    },
    onError: () => {
      toast.error('Errore disabilitazione auto-cleanup');
    }
  });
  
  return {
    enableAutoCleanup,
    disableAutoCleanup,
  };
}

// ===== QUERY HOOKS (per dati) =====

/**
 * Hook per ottenere preset di export
 */
export function useExportPresets() {
  return useQuery({
    queryKey: IMPORT_EXPORT_QUERY_KEYS.EXPORT_PRESETS,
    queryFn: async () => {
      try {
        return await apiClient.getExportPresets();
      } catch (error) {
        console.warn('Export presets not available:', error);
        // Ritorna preset di fallback invece di lanciare errore
        return {
          success: true,
          data: [
            {
              id: 'invoices-default',
              name: 'Fatture Standard',
              type: 'invoices',
              format: 'excel',
              filters: {},
              columns: ['numero', 'data', 'cliente', 'importo']
            }
          ]
        };
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
    // ✅ FIX: Rimosso onError che non è supportato in useQuery v5
  });
}

/**
 * Hook per storico import
 */
export function useImportHistory(limit = 20) {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.IMPORT_HISTORY, limit],
    queryFn: () => apiClient.getImportHistory(limit),
    staleTime: 120000, // 2 minutes
    retry: 1,
  });
}

/**
 * Hook per template di import
 */
export function useImportTemplate(dataType: 'invoices' | 'transactions' | 'anagraphics') {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.TEMPLATES, dataType],
    queryFn: () => apiClient.getImportTemplate(dataType),
    staleTime: 600000, // 10 minutes
    enabled: !!dataType,
    retry: 1,
  });
}

/**
 * Hook per formati supportati
 */
export function useSupportedFormats() {
  return useQuery({
    queryKey: IMPORT_EXPORT_QUERY_KEYS.SUPPORTED_FORMATS,
    queryFn: () => apiClient.getSupportedFormats(),
    staleTime: 600000, // 10 minutes
    retry: 1,
  });
}

/**
 * Hook per statistiche import
 */
export function useImportStatistics() {
  return useQuery({
    queryKey: IMPORT_EXPORT_QUERY_KEYS.IMPORT_STATISTICS,
    queryFn: () => apiClient.getImportStatistics(),
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook per health check import/export
 */
export function useImportExportHealth() {
  return useQuery({
    queryKey: ['import-export-health'],
    queryFn: () => apiClient.getImportExportHealth(),
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook per tracking status import
 */
export function useImportStatus(importId: string) {
  return useQuery({
    queryKey: [...IMPORT_EXPORT_QUERY_KEYS.IMPORT_STATUS, importId],
    queryFn: () => apiClient.getImportStatus(importId),
    enabled: !!importId,
    refetchInterval: 2000, // Poll ogni 2 secondi per status live
    retry: 1,
  });
}

// ===== UTILITY HOOKS =====

/**
 * Hook per gestire progress upload
 */
export function useFileUploadProgress() {
  const setLoading = useUIStore(state => state.setLoading);
  
  return {
    startProgress: (fileId: string) => {
      setLoading(`upload-${fileId}`, true);
    },
    updateProgress: (fileId: string, progress: number) => {
      console.log(`Upload progress for ${fileId}: ${progress}%`);
    },
    completeProgress: (fileId: string) => {
      setLoading(`upload-${fileId}`, false);
    },
    errorProgress: (fileId: string) => {
      setLoading(`upload-${fileId}`, false);
    }
  };
}

/**
 * Hook per gestire progress import
 */
export function useImportProgress() {
  const setLoading = useUIStore(state => state.setLoading);
  const loadingStates = useUIStore(state => state.loadingStates);
  
  return {
    startImport: (type: string) => setLoading(`import-${type}`, true),
    finishImport: (type: string) => setLoading(`import-${type}`, false),
    isImporting: (type: string) => loadingStates[`import-${type}`] || false,
    getActiveImports: () => {
      return Object.keys(loadingStates)
        .filter(key => key.startsWith('import-') && loadingStates[key])
        .map(key => key.replace('import-', ''));
    }
  };
}

/**
 * Hook per gestire notifiche import/export
 */
export function useImportExportNotifications() {
  const addNotification = useUIStore(state => state.addNotification);
  
  return {
    notifyImportSuccess: (type: string, count: number) => {
      addNotification({
        type: 'success',
        title: `Import ${type} Completato`,
        message: `${count} record importati con successo`
      });
    },
    notifyImportError: (type: string, error: string) => {
      addNotification({
        type: 'error',
        title: `Errore Import ${type}`,
        message: error
      });
    },
    notifyExportSuccess: (type: string, format: string) => {
      addNotification({
        type: 'success',
        title: `Export Completato`,
        message: `${type} esportato in formato ${format}`
      });
    },
    notifyValidationWarning: (warnings: string[]) => {
      addNotification({
        type: 'warning',
        title: 'Avvisi Validazione',
        message: `${warnings.length} avvisi trovati durante la validazione`
      });
    }
  };
}

// ===== COMBINED OPERATIONS HOOK =====

/**
 * Hook principale che combina tutte le operazioni
 */
export function useImportExportOperations() {
  const importInvoicesZIP = useImportInvoicesZIP();
  const importTransactionsCSV = useImportTransactionsCSV();
  const bulkImport = useBulkImportData();
  const batchImport = useBatchImport();
  
  const validateFiles = useValidateInvoiceFiles();
  const validateCSV = useValidateTransactionsCSV();
  const validateZIP = useValidateZIP();
  
  const exportData = useExportData();
  const exportWithPreset = useExportWithPreset();
  const downloadTemplate = useDownloadTemplate();
  
  const cleanupTempFiles = useCleanupTempFiles();
  const cleanupManagement = useCleanupManagement();
  
  const uploadProgress = useFileUploadProgress();
  const importProgress = useImportProgress();
  const notifications = useImportExportNotifications();
  
  return {
    // Import operations
    importInvoicesZIP,
    importTransactionsCSV,
    bulkImport,
    batchImport,
    
    // Validation operations
    validateFiles,
    validateCSV,
    validateZIP,
    
    // Export operations
    exportData,
    exportWithPreset,
    downloadTemplate,
    
    // Cleanup operations
    cleanupTempFiles,
    cleanupManagement,
    
    // Utility operations
    uploadProgress,
    importProgress,
    notifications,
    
    // Status checks
    isLoading: importInvoicesZIP.isPending || 
               importTransactionsCSV.isPending || 
               bulkImport.isPending ||
               batchImport.isPending ||
               validateFiles.isPending || 
               validateCSV.isPending ||
               validateZIP.isPending ||
               exportData.isPending ||
               exportWithPreset.isPending ||
               downloadTemplate.isPending ||
               cleanupTempFiles.isPending,
               
    hasError: importInvoicesZIP.isError || 
              importTransactionsCSV.isError || 
              bulkImport.isError ||
              batchImport.isError ||
              validateFiles.isError || 
              validateCSV.isError ||
              validateZIP.isError ||
              exportData.isError ||
              exportWithPreset.isError ||
              downloadTemplate.isError ||
              cleanupTempFiles.isError,
              
    // Quick actions
    quickImport: {
      invoices: (file: File) => importInvoicesZIP.mutateAsync(file),
      transactions: (file: File) => importTransactionsCSV.mutateAsync(file),
      bulk: (dataType: 'invoices' | 'transactions' | 'anagraphics', file: File) => 
        bulkImport.mutateAsync({ dataType, file })
    },
    
    quickExport: {
      invoices: (format: 'csv' | 'excel' | 'json' = 'excel') => 
        exportData.mutateAsync({ dataType: 'invoices', format }),
      transactions: (format: 'csv' | 'excel' | 'json' = 'csv') => 
        exportData.mutateAsync({ dataType: 'transactions', format }),
      anagraphics: (format: 'csv' | 'excel' | 'json' = 'excel') => 
        exportData.mutateAsync({ dataType: 'anagraphics', format })
    },
    
    quickValidate: {
      csv: (file: File) => validateCSV.mutateAsync(file),
      zip: (file: File) => validateZIP.mutateAsync(file),
      invoices: (files: File[]) => validateFiles.mutateAsync(files)
    }
  };
}

// ===== DEFAULT EXPORT =====
export default useImportExportOperations;
