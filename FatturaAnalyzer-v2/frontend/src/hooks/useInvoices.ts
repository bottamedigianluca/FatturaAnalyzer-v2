import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useDataStore, useUIStore } from '@/store';
import type { 
  Invoice, 
  InvoiceFilters, 
  InvoiceCreate, 
  InvoiceUpdate, 
  PaginatedResponse 
} from '@/types';

export function useInvoices(filters?: InvoiceFilters) {
  const { setInvoices, addRecentInvoice } = useDataStore();
  
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const response = await apiClient.getInvoices(filters);
      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<Invoice>;
        setInvoices(data.items, data.total);
        return data;
      }
      throw new Error(response.message || 'Errore nel caricamento fatture');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useInvoice(id: number) {
  const { addRecentInvoice } = useDataStore();
  
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const invoice = await apiClient.getInvoiceById(id);
      addRecentInvoice(invoice);
      return invoice;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  const { updateInvoice } = useDataStore();

  return useMutation({
    mutationFn: (data: InvoiceCreate) => apiClient.createInvoice(data),
    onSuccess: (newInvoice) => {
      // Invalida cache liste
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Aggiorna store
      updateInvoice(newInvoice.id, newInvoice);
      
      addNotification({
        type: 'success',
        title: 'Fattura creata',
        message: `Fattura ${newInvoice.doc_number} creata con successo`,
        duration: 3000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore creazione fattura',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  const { updateInvoice } = useDataStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: InvoiceUpdate }) => 
      apiClient.updateInvoice(id, data),
    onSuccess: (updatedInvoice) => {
      // Aggiorna cache specifica
      queryClient.setQueryData(['invoice', updatedInvoice.id], updatedInvoice);
      
      // Invalida liste
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      // Aggiorna store
      updateInvoice(updatedInvoice.id, updatedInvoice);
      
      addNotification({
        type: 'success',
        title: 'Fattura aggiornata',
        message: `Fattura ${updatedInvoice.doc_number} aggiornata`,
        duration: 3000,
      });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  const { removeInvoice } = useDataStore();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteInvoice(id),
    onSuccess: (_, invoiceId) => {
      // Rimuovi da cache
      queryClient.removeQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Aggiorna store
      removeInvoice(invoiceId);
      
      addNotification({
        type: 'success',
        title: 'Fattura eliminata',
        message: 'Fattura eliminata con successo',
        duration: 3000,
      });
    },
  });
}

export function useUpdateInvoicePaymentStatus() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  const { updateInvoice } = useDataStore();

  return useMutation({
    mutationFn: ({ 
      id, 
      payment_status, 
      paid_amount 
    }: { 
      id: number; 
      payment_status: string; 
      paid_amount?: number;
    }) => apiClient.updateInvoicePaymentStatus(id, payment_status, paid_amount),
    onSuccess: (response, { id, payment_status, paid_amount }) => {
      // Aggiorna cache locale
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Aggiorna store
      updateInvoice(id, { 
        payment_status: payment_status as any, 
        paid_amount: paid_amount 
      });
      
      addNotification({
        type: 'success',
        title: 'Stato pagamento aggiornato',
        message: `Stato fattura aggiornato a: ${payment_status}`,
        duration: 3000,
      });
    },
  });
}

export function useInvoiceReconciliationLinks(invoiceId: number) {
  return useQuery({
    queryKey: ['invoice-reconciliation-links', invoiceId],
    queryFn: () => apiClient.getInvoiceReconciliationLinks(invoiceId),
    enabled: !!invoiceId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useOverdueInvoices(limit: number = 20) {
  return useQuery({
    queryKey: ['overdue-invoices', limit],
    queryFn: () => apiClient.getOverdueInvoices(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAgingSummary(invoice_type: 'Attiva' | 'Passiva' = 'Attiva') {
  return useQuery({
    queryKey: ['aging-summary', invoice_type],
    queryFn: () => apiClient.getAgingSummary(invoice_type),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchInvoices() {
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ query, type_filter }: { query: string; type_filter?: string }) =>
      apiClient.searchInvoices(query, type_filter),
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Errore ricerca',
        message: 'Errore durante la ricerca fatture',
        duration: 3000,
      });
    },
  });
}

// Hook per bulk operations
export function useBulkInvoiceOperations() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ 
      invoiceIds, 
      payment_status 
    }: { 
      invoiceIds: number[]; 
      payment_status: string;
    }) => {
      const results = await Promise.allSettled(
        invoiceIds.map(id => 
          apiClient.updateInvoicePaymentStatus(id, payment_status)
        )
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: invoiceIds.length };
    },
    onSuccess: ({ successful, failed, total }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      addNotification({
        type: successful === total ? 'success' : 'warning',
        title: 'Operazione bulk completata',
        message: `${successful}/${total} fatture aggiornate con successo${failed > 0 ? `, ${failed} errori` : ''}`,
        duration: 5000,
      });
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      const results = await Promise.allSettled(
        invoiceIds.map(id => apiClient.deleteInvoice(id))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: invoiceIds.length };
    },
    onSuccess: ({ successful, failed, total }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      addNotification({
        type: successful === total ? 'success' : 'warning',
        title: 'Eliminazione bulk completata',
        message: `${successful}/${total} fatture eliminate${failed > 0 ? `, ${failed} errori` : ''}`,
        duration: 5000,
      });
    },
  });

  return {
    bulkUpdateStatus,
    bulkDelete,
  };
}

// Hook per statistiche fatture
export function useInvoiceStats() {
  return useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => apiClient.getInvoicesStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}