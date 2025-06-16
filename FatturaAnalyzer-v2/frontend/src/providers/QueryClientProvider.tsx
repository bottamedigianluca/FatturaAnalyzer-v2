/**
 * QueryClientProvider V4.0 for FatturaAnalyzer
 * Provider per React Query con configurazione ottimizzata
 */

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configurazione ottimizzata per FatturaAnalyzer
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minuti
      gcTime: 30 * 60 * 1000, // 30 minuti (cache time)
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: (failureCount, error: any) => {
        // Non ritentare per errori 4xx
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Riprova max 2 volte per altri errori
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;

// Export del client per uso in componenti specifici se necessario
export { queryClient };
