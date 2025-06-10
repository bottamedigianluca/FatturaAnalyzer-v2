/**
 * Query Client Provider V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Provider per React Query con ottimizzazioni avanzate:
 * - Smart retry logic
 * - Performance monitoring
 * - Background refetch optimization
 * - Error handling integration
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useUIStore } from '@/store';

// ===== QUERY CLIENT CONFIGURATION V4.0 =====

/**
 * Crea un QueryClient ottimizzato per V4.0
 */
const createQueryClient = () => {
  const { addNotification, setError, setLoading } = useUIStore.getState();

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error: any, query) => {
        console.error('🔥 Query Error V4.0:', error, query);
        
        // Gestione errori specifica per tipo
        const errorMessage = getErrorMessage(error);
        const queryKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
        
        // Notifica solo errori critici
        if (isCriticalError(error)) {
          addNotification({
            type: 'error',
            title: 'Errore di Caricamento',
            message: errorMessage,
            duration: 6000,
          });
        }
        
        // Aggiorna stato errore nel store
        setError(String(queryKey), errorMessage);
      },
      onSuccess: (data, query) => {
        const queryKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
        
        // Pulisci errori precedenti
        setError(String(queryKey), null);
      },
    }),
    
    mutationCache: new MutationCache({
      onError: (error: any, variables, context, mutation) => {
        console.error('🔥 Mutation Error V4.0:', error, mutation);
        
        const errorMessage = getErrorMessage(error);
        
        // Notifica sempre gli errori delle mutazioni
        addNotification({
          type: 'error',
          title: 'Errore Operazione',
          message: errorMessage,
          duration: 8000,
        });
      },
      onSuccess: (data, variables, context, mutation) => {
        // Le notifiche di successo sono gestite dai singoli hook
        console.log('✅ Mutation Success V4.0:', mutation.options.mutationKey);
      },
    }),
    
    defaultOptions: {
      queries: {
        // Retry logic intelligente V4.0
        retry: (failureCount, error: any) => {
          // Non ritentare errori client (4xx)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          
          // Retry limitato per errori di rete
          if (error?.message?.includes('Network Error') || error?.message?.includes('fetch')) {
            return failureCount < 3;
          }
          
          // Retry per errori server (5xx)
          if (error?.status >= 500) {
            return failureCount < 2;
          }
          
          // Retry specifico per backend non raggiungibile
          if (error?.message?.includes('Backend non raggiungibile')) {
            return failureCount < 3;
          }
          
          // Retry per timeout
          if (error?.name === 'TimeoutError') {
            return failureCount < 2;
          }
          
          // Default: un solo retry
          return failureCount < 1;
        },
        
        // Delay progressivo per retry
        retryDelay: (attemptIndex) => {
          const baseDelay = 1000; // 1 secondo
          const maxDelay = 30000; // 30 secondi max
          const delay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
          
          // Aggiungi jitter per evitare thundering herd
          const jitter = Math.random() * 0.1 * delay;
          return delay + jitter;
        },
        
        // Configurazione cache intelligente
        staleTime: 5 * 60 * 1000, // 5 minuti - dati considerati freschi
        gcTime: 30 * 60 * 1000, // 30 minuti - garbage collection
        
        // Background refetch ottimizzato
        refetchOnWindowFocus: false, // Disabilitato per performance
        refetchOnMount: true, // Sempre refetch al mount
        refetchOnReconnect: 'always', // Refetch quando torna la connessione
        
        // Rete e performance
        networkMode: 'online', // Solo quando online
        
        // Configurazione placeholder data
        placeholderData: undefined, // Gestito dai singoli hook se necessario
        
        // Meta informazioni per debugging
        meta: {
          version: '4.0',
          enhanced: true,
        },
      },
      
      mutations: {
        // Retry limitato per mutazioni
        retry: (failureCount, error: any) => {
          // Non ritentare errori di validazione
          if (error?.status === 400 || error?.status === 422) {
            return false;
          }
          
          // Un solo retry per errori di rete
          if (error?.message?.includes('Network Error')) {
            return failureCount < 1;
          }
          
          return false; // Default: no retry per mutazioni
        },
        
        // Timeout per mutazioni
        networkMode: 'online',
        
        // Meta informazioni
        meta: {
          version: '4.0',
          enhanced: true,
        },
      },
    },
  });
};

// ===== ERROR HANDLING UTILITIES =====

/**
 * Ottiene messaggio d'errore user-friendly
 */
function getErrorMessage(error: any): string {
  if (error?.message?.includes('Backend non raggiungibile')) {
    return 'Backend non raggiungibile. Verificare la connessione.';
  }
  
  if (error?.message?.includes('AI service unavailable')) {
    return 'Servizio AI temporaneamente non disponibile.';
  }
  
  if (error?.message?.includes('Network Error') || error?.message?.includes('fetch')) {
    return 'Errore di connessione. Verificare la rete.';
  }
  
  if (error?.status === 401) {
    return 'Sessione scaduta. Effettuare nuovamente il login.';
  }
  
  if (error?.status === 403) {
    return 'Operazione non autorizzata.';
  }
  
  if (error?.status === 404) {
    return 'Risorsa non trovata.';
  }
  
  if (error?.status === 422) {
    return 'Dati non validi. Verificare i campi inseriti.';
  }
  
  if (error?.status >= 500) {
    return 'Errore interno del server. Riprovare più tardi.';
  }
  
  return error?.message || 'Errore imprevisto';
}

/**
 * Determina se un errore è critico e richiede notifica
 */
function isCriticalError(error: any): boolean {
  // Errori di autenticazione
  if (error?.status === 401) return true;
  
  // Errori server
  if (error?.status >= 500) return true;
  
  // Backend non raggiungibile
  if (error?.message?.includes('Backend non raggiungibile')) return true;
  
  // Errori di rete ripetuti
  if (error?.message?.includes('Network Error')) return true;
  
  return false;
}

// ===== SINGLETON QUERY CLIENT =====
let queryClient: QueryClient;

const getQueryClient = () => {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
};

// ===== PROVIDER COMPONENT =====
interface QueryProviderProps {
  children: ReactNode;
  enableDevtools?: boolean;
}

export function QueryProvider({ 
  children, 
  enableDevtools = import.meta.env.DEV 
}: QueryProviderProps) {
  const client = React.useMemo(() => getQueryClient(), []);

  return (
    <QueryClientProvider client={client}>
      {children}
      {enableDevtools && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{
            style: {
              marginRight: '20px',
              marginBottom: '20px',
            },
          }}
        />
      )}
    </QueryClientProvider>
  );
}

// ===== PERFORMANCE MONITORING HOOK =====

/**
 * Hook per monitorare performance delle query
 */
export function useQueryPerformanceMonitor() {
  const queryClient = getQueryClient();
  
  React.useEffect(() => {
    const cache = queryClient.getQueryCache();
    
    const unsubscribe = cache.subscribe((event) => {
      if (event.type === 'updated' && event.query.state.fetchStatus === 'idle') {
        const { dataUpdatedAt, errorUpdatedAt } = event.query.state;
        const duration = Date.now() - (dataUpdatedAt || errorUpdatedAt);
        
        // Log query lente (> 3 secondi)
        if (duration > 3000) {
          console.warn('🐌 Slow Query Detected V4.0:', {
            queryKey: event.query.queryKey,
            duration: `${duration}ms`,
            staleTime: event.query.options.staleTime,
            gcTime: event.query.options.gcTime,
          });
        }
      }
    });
    
    return unsubscribe;
  }, [queryClient]);
}

// ===== CACHE MANAGEMENT UTILITIES =====

/**
 * Utilities per gestione cache avanzata
 */
export const cacheUtils = {
  /**
   * Pulisce tutta la cache
   */
  clearAll: () => {
    const client = getQueryClient();
    client.clear();
  },
  
  /**
   * Invalida query per pattern
   */
  invalidatePattern: (pattern: string) => {
    const client = getQueryClient();
    client.invalidateQueries({
      predicate: (query) => {
        const key = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
        return String(key).includes(pattern);
      },
    });
  },
  
  /**
   * Rimuove query obsolete
   */
  removeStale: () => {
    const client = getQueryClient();
    const cache = client.getQueryCache();
    
    cache.getAll().forEach((query) => {
      if (query.isStale()) {
        cache.remove(query);
      }
    });
  },
  
  /**
   * Ottiene statistiche cache
   */
  getStats: () => {
    const client = getQueryClient();
    const cache = client.getQueryCache();
    const queries = cache.getAll();
    
    return {
      total: queries.length,
      active: queries.filter(q => q.getObserversCount() > 0).length,
      stale: queries.filter(q => q.isStale()).length,
      fetching: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errors: queries.filter(q => q.state.status === 'error').length,
    };
  },
  
  /**
   * Prefetch intelligente
   */
  smartPrefetch: async (queryKey: any[], queryFn: () => Promise<any>) => {
    const client = getQueryClient();
    const existing = client.getQueryData(queryKey);
    
    if (!existing) {
      await client.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 10 * 60 * 1000, // 10 minuti per prefetch
      });
    }
  },
};

// ===== NETWORK STATUS INTEGRATION =====

/**
 * Hook per gestire stato di rete
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const queryClient = getQueryClient();
  
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      // Riprova query fallite quando torna la connessione
      queryClient.invalidateQueries({
        predicate: (query) => query.state.status === 'error',
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);
  
  return isOnline;
}

// ===== EXPORTS =====
export { getQueryClient, cacheUtils };
export default QueryProvider;
