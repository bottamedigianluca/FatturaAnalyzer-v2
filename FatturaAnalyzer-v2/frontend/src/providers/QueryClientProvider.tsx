import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client instance once.
// This client will be shared across the entire application.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/**
 * Provides the React Query client to the application.
 * All data fetching hooks (`useQuery`, `useMutation`) will use this client.
 */
export function QueryClientProviderComponent({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
