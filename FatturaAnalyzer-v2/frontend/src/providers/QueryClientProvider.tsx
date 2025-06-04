// Path: frontend/src/providers/QueryClientProvider.tsx
import React, { ReactNode } from 'react';
// import { QueryClient, QueryClientProvider as RQProvider } from '@tanstack/react-query';

// const queryClient = new QueryClient();

export function QueryClientProviderComponent({ children }: { children: ReactNode }) {
  // return <RQProvider client={queryClient}>{children}</RQProvider>;
  return <>{children}</>; // Placeholder
}
