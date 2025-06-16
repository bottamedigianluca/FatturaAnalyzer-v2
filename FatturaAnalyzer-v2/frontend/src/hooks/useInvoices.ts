/**
 * Invoices Hooks V4.0 - CORRETTI EXPORTS
 * Hook per gestione completa fatture con tutti gli export necessari
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api';
import type { Invoice, InvoiceFilters } from '@/types';
import { 
  useDataStore,
  useUIStore 
} from '@/store';
import { useSmartCache, useSmartErrorHandling } from './useUtils';

// ===== QUERY KEYS =====
export const INVOICES_QUERY_KEYS = {
  INVOICES: ['invoices'] as const,
  INVOICE: ['invoice'] as const,
  SEARCH: ['search', 'invoices'] as const,
  STATS: ['stats', 'invoices'] as const,
  OVERDUE: ['invoices', 'overdue'] as const,
  AGING: ['invoices', 'aging'] as const,
} as const;

/**
 * Hook per lista fatture con filtri avanzati e caching intelligente
 */
export const useInvoices = (filters: InvoiceFilters = {}) => {
  const setInvoices = useDataStore(state => state.setInvoices);
  const invoicesCache = useDataStore(state => state.invoices);
  const { shouldRefetch } = useSmartCache();
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...INVOICES_QUERY_KEYS.INVOICES, filters],
    queryFn: async () => {
      const result = await apiClient.getInvoices(filters);
      setInvoices(result.items || [], result.total || 0, result.enhanced_data);
      return result;
    },
    staleTime: 300000, // 5 minutes
    enabled: shouldRefetch(invoicesCache.lastFetch, 'invoices'),
    onError: (error) => handleError(error, 'invoices'),
  });
};

/**
 * Hook per singola fattura con dettagli completi
 */
export const useInvoice = (id: number, enabled = true) => {
  const addRecentInvoice = useDataStore(state => state.addRecentInvoice);
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...INVOICES_QUERY_KEYS.INVOICE, id],
    queryFn: async () => {
      const invoice = await apiClient.getInvoiceById(id);
      addRecentInvoice(invoice);
      return invoice;
    },
    enabled: enabled && !!id,
    staleTime: 300000,
    onError: (error) => handleError(error, 'invoice-detail'),
  });
};

/**
 * Hook per creazione/aggiornamento fatture con ottimistic updates
 */
export const useInvoiceMutation = () => {
  const queryClient = useQueryClient();
  const updateInvoice = useDataStore(state => state.updateInvoice);
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  const createMutation = useMutation({
    mutationFn: (data: Partial<Invoice>) => apiClient.createInvoice(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEYS.INVOICES });
      addNotification({
        type: 'success',
        title: 'Fattura Creata',
        message: `Fattura ${data.numero} creata con successo`,
      });
    },
    onError: (error) => {
      handleError(error, 'create-invoice');
      toast.error('Errore nella creazione della fattura');
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Invoice> }) => 
      apiClient.updateInvoice(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [...INVOICES_QUERY_KEYS.INVOICE, id] });
      updateInvoice(id, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEYS.INVOICES });
      toast.success('Fattura aggiornata');
    },
    onError: (error, { id }) => {
      handleError(error, 'update-invoice');
      queryClient.invalidateQueries({ queryKey: [...INVOICES_QUERY_KEYS.INVOICE, id] });
      toast.error('Errore nell\'aggiornamento');
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEYS.INVOICES });
      toast.success('Fattura eliminata');
    },
    onError: (error) => {
      handleError(error, 'delete-invoice');
      toast.error('Errore nell\'eliminazione');
    },
  });
  
  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ id, status, amount }: { id: number; status: string; amount?: number }) =>
      apiClient.updateInvoicePaymentStatus(id, status, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEYS.INVOICES });
      toast.success('Stato pagamento aggiornato');
    },
    onError: (error) => {
      handleError(error, 'update-payment-status');
      toast.error('Errore nell\'aggiornamento stato');
    },
  });
  
  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    updatePaymentStatus: updatePaymentStatusMutation,
  };
};

/**
 * 🔥 HOOK MANCANTE: Operazioni bulk per fatture
 */
export const useBulkInvoiceOperations = () => {
  const queryClient = useQueryClient();
  const addNotification = useUIStore(state => state.addNotification);
  const { handleError } = useSmartErrorHandling();
  
  const bulkUpdateStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: number[]; status: string }) => {
      // Batch update delle fatture
      return Promise.all(
        ids.map(id => apiClient.updateInvoicePaymentStatus(id, status))
      );
    },
    onSuccess: (data, { ids, status }) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEYS.INVOICES });
      addNotification({
        type: 'success',
        title: 'Aggiornamento Completato',
        message: `${ids.length} fatture aggiornate a "${status}"`,
      });
    },
    onError: (error) => {
      handleError(error, 'bulk-update-status');
      toast.error('Errore nell\'aggiornamento bulk');
    },
  });
  
  const bulkDelete = useMutation({
    mutationFn: (ids: number[]) => {
      return Promise.all(
        ids.map(id => apiClient.deleteInvoice(id))
      );
    },
    onSuccess: (data, ids) => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEYS.INVOICES });
      addNotification({
        type: 'success',
        title: 'Eliminazione Completata',
        message: `${ids.length} fatture eliminate`,
      });
    },
    onError: (error) => {
      handleError(error, 'bulk-delete');
      toast.error('Errore nell\'eliminazione bulk');
    },
  });
  
  const bulkExport = useMutation({
    mutationFn: async ({ ids, format }: { ids: number[]; format: 'excel' | 'csv' | 'json' }) => {
      // Per ora esportiamo con filtro sugli ID (implementazione semplificata)
      const result = await apiClient.exportInvoices(format);
      
      if (format === 'json') {
        const url = 'data:application/json;charset=utf-8,' + 
          encodeURIComponent(JSON.stringify(result, null, 2));
        const a = document.createElement('a');
        a.href = url;
        a.download = `fatture_bulk.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const url = window.URL.createObjectURL(result as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fatture_bulk.${format}`;
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
        message: `${ids.length} fatture esportate in formato ${format}`,
      });
    },
    onError: (error) => {
      handleError(error, 'bulk-export');
      toast.error('Errore nell\'export bulk');
    },
  });
  
  return {
    bulkUpdateStatus,
    bulkDelete,
    bulkExport,
    isProcessing: bulkUpdateStatus.isPending || bulkDelete.isPending || bulkExport.isPending,
  };
};

/**
 * 🔥 HOOK MANCANTE: Delete singolo per fatture (alias per backward compatibility)
 */
export const useDeleteInvoice = () => {
  const { delete: deleteMutation } = useInvoiceMutation();
  return deleteMutation;
};

/**
 * Hook per ricerca fatture
 */
export const useInvoicesSearch = (query: string, typeFilter?: string) => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...INVOICES_QUERY_KEYS.SEARCH, query, typeFilter],
    queryFn: () => apiClient.searchInvoices(query, typeFilter, 20),
    enabled: query.length >= 2,
    staleTime: 300000,
    onError: (error) => handleError(error, 'search-invoices'),
  });
};

/**
 * Hook per fatture scadute
 */
export const useOverdueInvoices = (limit = 20) => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...INVOICES_QUERY_KEYS.OVERDUE, limit],
    queryFn: () => apiClient.getOverdueInvoices(limit),
    staleTime: 300000, // 5 minutes
    onError: (error) => handleError(error, 'overdue-invoices'),
  });
};

/**
 * Hook per aging summary
 */
export const useAgingSummary = (invoiceType: 'Attiva' | 'Passiva' = 'Attiva') => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...INVOICES_QUERY_KEYS.AGING, invoiceType],
    queryFn: () => apiClient.getAgingSummary(invoiceType),
    staleTime: 600000, // 10 minutes
    onError: (error) => handleError(error, 'aging-summary'),
  });
};

/**
 * Hook per statistiche fatture
 */
export const useInvoicesStats = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: INVOICES_QUERY_KEYS.STATS,
    queryFn: () => apiClient.getInvoicesStats(),
    staleTime: 300000, // 5 minutes
    onError: (error) => handleError(error, 'invoices-stats'),
  });
};

/**
 * Hook per reconciliation links di una fattura
 */
export const useInvoiceReconciliationLinks = (invoiceId: number) => {
  const { handleError } = useSmartErrorHandling();
  
  return useQuery({
    queryKey: [...INVOICES_QUERY_KEYS.INVOICE, invoiceId, 'reconciliation-links'],
    queryFn: () => apiClient.getInvoiceReconciliationLinks(invoiceId),
    enabled: !!invoiceId,
    staleTime: 180000, // 3 minutes
    onError: (error) => handleError(error, 'invoice-reconciliation-links'),
  });
};

/**
 * Hook per infinite query fatture con paginazione intelligente
 */
export const useInfiniteInvoices = (filters: InvoiceFilters = {}) => {
  const { handleError } = useSmartErrorHandling();
  
  return useInfiniteQuery({
    queryKey: [...INVOICES_QUERY_KEYS.INVOICES, 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => apiClient.getInvoices({ 
      ...filters, 
      page: pageParam, 
      size: 20 
    }),
    getNextPageParam: (lastPage, allPages) => {
      const hasNextPage = (lastPage.total || 0) > allPages.length * 20;
      return hasNextPage ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 300000,
    onError: (error) => handleError(error, 'infinite-invoices'),
  });
};

/**
 * Hook per export fatture avanzato
 */
export const useInvoicesExport = () => {
  const { handleError } = useSmartErrorHandling();
  
  return useMutation({
    mutationFn: async (options: {
      format: 'excel' | 'csv' | 'json';
      filters?: InvoiceFilters;
      include_lines?: boolean;
      include_vat?: boolean;
    }) => {
      const result = await apiClient.exportInvoices(
        options.format,
        options.filters?.type_filter,
        options.filters?.status_filter,
        options.filters?.start_date,
        options.filters?.end_date,
        options.include_lines || false,
        options.include_vat || false
      );
      
      if (options.format === 'json') {
        const url = 'data:application/json;charset=utf-8,' + 
          encodeURIComponent(JSON.stringify(result, null, 2));
        const a = document.createElement('a');
        a.href = url;
        a.download = `fatture_export.${options.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const url = window.URL.createObjectURL(result as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fatture_export.${options.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Export fatture completato');
    },
    onError: (error) => {
      handleError(error, 'export-invoices');
      toast.error('Errore nell\'export fatture');
    },
  });
};
