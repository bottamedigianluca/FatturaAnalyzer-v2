import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useDataStore, useUIStore } from '@/store';
import type { 
  BankTransaction, 
  TransactionFilters, 
  BankTransactionCreate, 
  BankTransactionUpdate, 
  PaginatedResponse,
  ReconciliationStatus
} from '@/types';

export function useTransactions(filters?: TransactionFilters) {
  const { setTransactions, addRecentTransaction } = useDataStore();
  
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const response = await apiClient.getTransactions(filters);
      if (response.success && response.data) {
        const data = response.data as PaginatedResponse<BankTransaction>;
        setTransactions(data.items, data.total);
        return data;
      }
      throw new Error(response.message || 'Errore nel caricamento transazioni');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useTransaction(id: number) {
  const { addRecentTransaction } = useDataStore();
  
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const transaction = await apiClient.getTransactionById(id);
      addRecentTransaction(transaction);
      return transaction;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  const { updateTransaction } = useDataStore();

  return useMutation({
    mutationFn: (data: BankTransactionCreate) => apiClient.createTransaction(data),
    onSuccess: (newTransaction) => {
      // Invalida cache liste
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Aggiorna store
      updateTransaction(newTransaction.id, newTransaction);
      
      addNotification({
        type: 'success',
        title: 'Transazione creata',
        message: 'Nuova transazione aggiunta con successo',
        duration: 3000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore creazione transazione',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  const { updateTransaction } = useDataStore();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BankTransactionUpdate }) => 
      apiClient.updateTransaction(id, data),
    onSuccess: (updatedTransaction) => {
      // Aggiorna cache specifica
      queryClient.setQueryData(['transaction', updatedTransaction.id], updatedTransaction);
      
      // Invalida liste
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Aggiorna store
      updateTransaction(updatedTransaction.id, updatedTransaction);
      
      addNotification({
        type: 'success',
        title: 'Transazione aggiornata',
        message: 'Transazione aggiornata con successo',
        duration: 3000,
      });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  const { removeTransaction } = useDataStore();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteTransaction(id),
    onSuccess: (_, transactionId) => {
      // Rimuovi da cache
      queryClient.removeQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Aggiorna store
      removeTransaction(transactionId);
      
      addNotification({
        type: 'success',
        title: 'Transazione eliminata',
        message: 'Transazione eliminata con successo',
        duration: 3000,
      });
    },
  });
}

export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  const { updateTransaction } = useDataStore();

  return useMutation({
    mutationFn: ({ 
      id, 
      reconciliation_status, 
      reconciled_amount 
    }: { 
      id: number; 
      reconciliation_status: ReconciliationStatus; 
      reconciled_amount?: number;
    }) => apiClient.updateTransactionStatus(id, reconciliation_status, reconciled_amount),
    onSuccess: (response, { id, reconciliation_status, reconciled_amount }) => {
      // Aggiorna cache locale
      queryClient.invalidateQueries({ queryKey: ['transaction', id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Aggiorna store
      updateTransaction(id, { 
        reconciliation_status, 
        reconciled_amount 
      });
      
      addNotification({
        type: 'success',
        title: 'Stato riconciliazione aggiornato',
        message: `Stato aggiornato a: ${reconciliation_status}`,
        duration: 3000,
      });
    },
  });
}

export function useBatchUpdateTransactionStatus() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ 
      transaction_ids, 
      reconciliation_status 
    }: { 
      transaction_ids: number[]; 
      reconciliation_status: ReconciliationStatus;
    }) => apiClient.batchUpdateTransactionStatus(transaction_ids, reconciliation_status),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      addNotification({
        type: 'success',
        title: 'Aggiornamento batch completato',
        message: `${response.data.successful} transazioni aggiornate con successo`,
        duration: 5000,
      });
    },
  });
}

export function useTransactionReconciliationLinks(transactionId: number) {
  return useQuery({
    queryKey: ['transaction-reconciliation-links', transactionId],
    queryFn: () => apiClient.getTransactionReconciliationLinks(transactionId),
    enabled: !!transactionId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useTransactionPotentialMatches(transactionId: number, limit: number = 10) {
  return useQuery({
    queryKey: ['transaction-potential-matches', transactionId, limit],
    queryFn: () => apiClient.getTransactionPotentialMatches(transactionId, limit),
    enabled: !!transactionId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useSearchTransactions() {
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ query, include_reconciled }: { query: string; include_reconciled?: boolean }) =>
      apiClient.searchTransactions(query, include_reconciled),
    onError: () => {
      addNotification({
        type: 'error',
        title: 'Errore ricerca',
        message: 'Errore durante la ricerca transazioni',
        duration: 3000,
      });
    },
  });
}

export function useTransactionStats() {
  return useQuery({
    queryKey: ['transaction-stats'],
    queryFn: () => apiClient.getTransactionStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCashFlowAnalysis(months: number = 12) {
  return useQuery({
    queryKey: ['cash-flow-analysis', months],
    queryFn: () => apiClient.getCashFlowAnalysis(months),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook per import CSV
export function useImportTransactionsCSV() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: (file: File) => apiClient.importTransactionsCSV(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      const { success, duplicates, errors } = result.data;
      
      if (success > 0) {
        addNotification({
          type: 'success',
          title: 'Import completato',
          message: `${success} transazioni importate con successo${duplicates > 0 ? `, ${duplicates} duplicati` : ''}${errors > 0 ? `, ${errors} errori` : ''}`,
          duration: 5000,
        });
      } else {
        addNotification({
          type: 'warning',
          title: 'Import senza nuove transazioni',
          message: `Nessuna nuova transazione importata. ${duplicates} duplicati, ${errors} errori`,
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore import',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

// Hook per export
export function useExportTransactions() {
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: ({ 
      format, 
      filters 
    }: { 
      format: 'excel' | 'csv' | 'json'; 
      filters?: any;
    }) => apiClient.exportTransactions(format, filters),
    onSuccess: (result, { format }) => {
      if (format !== 'json') {
        // Per Excel e CSV, result è un Blob
        const blob = result as Blob;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `transazioni_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        addNotification({
          type: 'success',
          title: 'Export completato',
          message: `File ${format.toUpperCase()} scaricato con successo`,
          duration: 3000,
        });
      }
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore export',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

// Hook per download template CSV
export function useDownloadTransactionTemplate() {
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: () => apiClient.downloadTransactionTemplate(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'template_transazioni_bancarie.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      addNotification({
        type: 'success',
        title: 'Template scaricato',
        message: 'Template CSV scaricato con successo',
        duration: 3000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore download',
        message: error.message,
        duration: 3000,
      });
    },
  });
}

// Hook per operazioni bulk
export function useBulkTransactionOperations() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  const bulkDelete = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      const results = await Promise.allSettled(
        transactionIds.map(id => apiClient.deleteTransaction(id))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: transactionIds.length };
    },
    onSuccess: ({ successful, failed, total }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      addNotification({
        type: successful === total ? 'success' : 'warning',
        title: 'Eliminazione bulk completata',
        message: `${successful}/${total} transazioni eliminate${failed > 0 ? `, ${failed} errori` : ''}`,
        duration: 5000,
      });
    },
  });

  return {
    bulkDelete,
  };
}