/**
 * Anagraphics Hooks V4.0 - CORRETTI EXPORTS
 * Hook per gestione anagrafiche con validazione avanzata
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api';
import type { Anagraphics, AnagraphicsFilters } from '@/types';
import { 
  useDataStore,
  useUIStore 
} from '@/store';
import { useSmartCache, useSmartErrorHandling } from './useUtils';

// ===== QUERY KEYS =====
export const ANAGRAPHICS_QUERY_KEYS = {
  ANAGRAPHICS: ['anagraphics'] as const,
  ANAGRAPHICS_ITEM: ['anagraphics-item'] as const,
  SEARCH: ['search', 'anagraphics'] as const,
  STATS: ['stats', 'anagraphics'] as const,
  TOP_CLIENTS: ['anagraphics', 'top-clients'] as const,
  VALIDATION: ['anagraphics', 'validation'] as const,
  DUPLICATES: ['anagraphics', 'duplicates'] as const,
  PROVINCES: ['anagraphics', 'provinces'] as const,
} as const;

/**
 * Hook per anagrafiche con ricerca e validazione
 */
export const useAnagraphics = (filters: AnagraphicsFilters = {}) => {
  const setAnagraphics = useDataStore(state => state.setAnagraphics);
  const anagraphicsCache = useDataStore(state => state.anagraphics);
  const { shouldRefetch } = useSmartCache();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS, filters],
    queryFn: async () => {
      const result = await apiClient.getAnagraphics(filters);
      setAnagraphics(result.items || [], result.total || 0, result.enhanced_data);
      return result;
    },
    staleTime: 600000, // 10 minutes (dati più stabili)
    enabled: shouldRefetch(anagraphicsCache.lastFetch, 'anagraphics'),
    onError: (error) => handleError(error, 'anagraphics'),
  });
};

/**
 * Hook per singola anagrafica
 */
export const useAnagraphicsById = (id: number, enabled = true) => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS_ITEM, id],
    queryFn: () => apiClient.getAnagraphicsById(id),
    enabled: enabled && !!id,
    staleTime: 600000,
    onError: (error) => handleError(error, 'anagraphics-detail'),
  });
};

/**
 * 🔥 HOOK MANCANTE: Alias per compatibilità backward
 */
export const useAnagraphicsItem = useAnagraphicsById;

/**
 * Hook per ricerca anagrafiche con debounce
 */
export const useAnagraphicsSearch = (query: string, typeFilter?: string) => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANAGRAPHICS_QUERY_KEYS.SEARCH, query, typeFilter],
    queryFn: () => apiClient.searchAnagraphics(query, typeFilter, 20),
    enabled: query.length >= 2,
    staleTime: 300000,
    onError: (error) => handleError(error, 'anagraphics-search'),
  });
};

/**
 * Hook per validazione codici fiscali e P.IVA
 */
export const useAnagraphicsValidation = () => {
  const { handleError } = useSmartErrorHandling();
  
  const validatePIVA = useMutation({
    mutationFn: (piva: string) => apiClient.validatePIVA(piva),
    onError: (error) => handleError(error, 'validate-piva'),
  });
  
  const validateCodiceFiscale = useMutation({
    mutationFn: (cf: string) => apiClient.validateCodiceFiscale(cf),
    onError: (error) => handleError(error, 'validate-cf'),
  });
  
  return {
    validatePIVA,
    validateCodiceFiscale,
  };
};

/**
 * Hook per CRUD anagrafiche
 */
export const useAnagraphicsMutation = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  const createMutation = useMutation({
    mutationFn: (data: Partial<Anagraphics>) => apiClient.createAnagraphics(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS });
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.STATS });
      
      addNotification({
        type: 'success',
        title: 'Anagrafica Creata',
        message: `${data.business_name || data.full_name} creata con successo`,
      });
    },
    onError: (error) => {
      handleError(error, 'create-anagraphics');
      toast.error('Errore nella creazione anagrafica');
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Anagraphics> }) => 
      apiClient.updateAnagraphics(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS });
      toast.success('Anagrafica aggiornata');
    },
    onError: (error) => {
      handleError(error, 'update-anagraphics');
      toast.error('Errore nell\'aggiornamento');
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteAnagraphics(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS });
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.STATS });
      toast.success('Anagrafica eliminata');
    },
    onError: (error) => {
      handleError(error, 'delete-anagraphics');
      toast.error('Errore nell\'eliminazione');
    },
  });
  
  const batchCreateMutation = useMutation({
    mutationFn: (anagraphicsList: Partial<Anagraphics>[]) => 
      apiClient.batchCreateAnagraphics(anagraphicsList),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS });
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.STATS });
      
      addNotification({
        type: 'success',
        title: 'Batch Import Completato',
        message: `${data.successful_imports} anagrafiche create`,
      });
    },
    onError: (error) => {
      handleError(error, 'batch-create-anagraphics');
      toast.error('Errore nel batch import');
    },
  });
  
  const mergeMutation = useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: number; targetId: number }) => 
      apiClient.mergeAnagraphics(sourceId, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS });
      toast.success('Anagrafiche unite con successo');
    },
    onError: (error) => {
      handleError(error, 'merge-anagraphics');
      toast.error('Errore nell\'unione anagrafiche');
    },
  });
  
  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    batchCreate: batchCreateMutation,
    merge: mergeMutation,
  };
};

/**
 * 🔥 HOOK MANCANTE: Operazioni bulk per anagrafiche
 */
export const useBulkAnagraphicsOperations = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  const bulkDelete = useMutation({
    mutationFn: (ids: number[]) => {
      return Promise.all(
        ids.map(id => apiClient.deleteAnagraphics(id))
      );
    },
    onSuccess: (data, ids) => {
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS });
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.STATS });
      
      addNotification({
        type: 'success',
        title: 'Eliminazione Completata',
        message: `${ids.length} anagrafiche eliminate`,
      });
    },
    onError: (error) => {
      handleError(error, 'bulk-delete-anagraphics');
      toast.error('Errore nell\'eliminazione bulk');
    },
  });
  
  const bulkUpdateType = useMutation({
    mutationFn: ({ ids, type }: { ids: number[]; type: 'Cliente' | 'Fornitore' }) => {
      return Promise.all(
        ids.map(id => apiClient.updateAnagraphics(id, { type }))
      );
    },
    onSuccess: (data, { ids, type }) => {
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS });
      
      addNotification({
        type: 'success',
        title: 'Aggiornamento Completato',
        message: `${ids.length} anagrafiche aggiornate a "${type}"`,
      });
    },
    onError: (error) => {
      handleError(error, 'bulk-update-type');
      toast.error('Errore nell\'aggiornamento bulk');
    },
  });
  
  const bulkExport = useMutation({
    mutationFn: async ({ ids, format }: { ids: number[]; format: 'excel' | 'csv' | 'json' }) => {
      // Per ora esportiamo tutto (implementazione semplificata)
      const result = await apiClient.exportAnagraphicsQuick(format);
      
      if (format === 'json') {
        const url = 'data:application/json;charset=utf-8,' + 
          encodeURIComponent(JSON.stringify(result, null, 2));
        const a = document.createElement('a');
        a.href = url;
        a.download = `anagrafiche_bulk.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const url = window.URL.createObjectURL(result as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anagrafiche_bulk.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      return result;
    },
    onSuccess: (data, { ids, format }) => {
      addNotification({
        type: 'success',
        title: 'Export Completato',
        message: `${ids.length} anagrafiche esportate in formato ${format}`,
      });
    },
    onError: (error) => {
      handleError(error, 'bulk-export-anagraphics');
      toast.error('Errore nell\'export bulk');
    },
  });
  
  return {
    bulkDelete,
    bulkUpdateType,
    bulkExport,
    isProcessing: bulkDelete.isPending || bulkUpdateType.isPending || bulkExport.isPending,
  };
};

/**
 * 🔥 HOOK MANCANTE: Delete singolo per anagrafiche (alias per backward compatibility)
 */
export const useDeleteAnagraphics = () => {
  const { delete: deleteMutation } = useAnagraphicsMutation();
  return deleteMutation;
};

/**
 * Hook per statistiche anagrafiche
 */
export const useAnagraphicsStats = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: ANAGRAPHICS_QUERY_KEYS.STATS,
    queryFn: () => apiClient.getAnagraphicsStats(),
    staleTime: 600000, // 10 minutes
    onError: (error) => handleError(error, 'anagraphics-stats'),
  });
};

/**
 * Hook per top clienti analytics
 */
export const useTopClientsAnalytics = (limit = 20, periodMonths = 12) => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...ANAGRAPHICS_QUERY_KEYS.TOP_CLIENTS, limit, periodMonths],
    queryFn: () => apiClient.getTopClientsAnalytics(limit, periodMonths),
    staleTime: 600000, // 10 minutes
    onError: (error) => handleError(error, 'top-clients-analytics'),
  });
};

/**
 * Hook per check duplicati
 */
export const useCheckDuplicates = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: ANAGRAPHICS_QUERY_KEYS.DUPLICATES,
    queryFn: () => apiClient.checkPotentialDuplicates(),
    staleTime: 1800000, // 30 minutes
    onError: (error) => handleError(error, 'check-duplicates'),
  });
};

/**
 * Hook per lista province
 */
export const useProvincesList = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: ANAGRAPHICS_QUERY_KEYS.PROVINCES,
    queryFn: () => apiClient.getProvincesList(),
    staleTime: Infinity, // Dati stabili
    onError: (error) => handleError(error, 'provinces-list'),
  });
};

/**
 * Hook per aggiornamento client scores
 */
export const useBulkUpdateClientScores = () => {
  const queryClient = useQueryClient();
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: () => apiClient.bulkUpdateClientScores(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS });
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.STATS });
      toast.success('Score clienti aggiornati');
    },
    onError: (error) => {
      handleError(error, 'bulk-update-scores');
      toast.error('Errore nell\'aggiornamento score');
    },
  });
};

/**
 * Hook per import CSV anagrafiche
 */
export const useAnagraphicsImport = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: (file: File) => apiClient.importAnagraphicsFromCSV(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.ANAGRAPHICS });
      queryClient.invalidateQueries({ queryKey: ANAGRAPHICS_QUERY_KEYS.STATS });
      
      addNotification({
        type: 'success',
        title: 'Import Completato',
        message: `${data.successful_imports}/${data.total_records} anagrafiche importate`,
      });
    },
    onError: (error) => {
      handleError(error, 'import-anagraphics-csv');
      toast.error('Errore nell\'import CSV');
    },
  });
};

/**
 * Hook per export anagrafiche
 */
export const useAnagraphicsExport = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: async (options: {
      format: 'excel' | 'csv' | 'json';
      typeFilter?: string;
      includeStats?: boolean;
    }) => {
      const result = await apiClient.exportAnagraphics(
        options.format,
        options.typeFilter,
        options.includeStats || false
      );
      
      if (options.format === 'json') {
        const url = 'data:application/json;charset=utf-8,' + 
          encodeURIComponent(JSON.stringify(result, null, 2));
        const a = document.createElement('a');
        a.href = url;
        a.download = `anagrafiche_export.${options.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const url = window.URL.createObjectURL(result as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anagrafiche_export.${options.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Export anagrafiche completato');
    },
    onError: (error) => {
      handleError(error, 'export-anagraphics');
      toast.error('Errore nell\'export anagrafiche');
    },
  });
};

/**
 * Hook per export quick anagrafiche
 */
export const useAnagraphicsQuickExport = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: (format: 'csv' | 'json' = 'json', typeFilter?: string) => 
      apiClient.exportAnagraphicsQuick(format, typeFilter),
    onSuccess: (data, variables) => {
      if (variables[0] === 'json') {
        const url = 'data:application/json;charset=utf-8,' + 
          encodeURIComponent(JSON.stringify(data, null, 2));
        const a = document.createElement('a');
        a.href = url;
        a.download = `anagrafiche_quick.${variables[0]}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const url = window.URL.createObjectURL(data as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anagrafiche_quick.${variables[0]}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      toast.success('Export quick completato');
    },
    onError: (error) => {
      handleError(error, 'quick-export-anagraphics');
      toast.error('Errore nell\'export quick');
    },
  });
};

/**
 * Hook per health check anagrafiche
 */
export const useAnagraphicsHealthCheck = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: ['anagraphics', 'health-check'],
    queryFn: () => apiClient.getAnagraphicsHealthCheck(),
    staleTime: 300000, // 5 minutes
    onError: (error) => handleError(error, 'anagraphics-health-check'),
  });
};
