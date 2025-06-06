/**
 * Barrel file for context providers
 * Central export point for all application providers
 */

// Authentication Provider
export { AuthProvider, useAuth } from './AuthProvider';
export type { User, AuthContextType } from './AuthProvider';

// Theme Provider  
export { ThemeProvider, useTheme } from './ThemeProvider';
export type { ThemeProviderProps, ThemeProviderState } from './ThemeProvider';

// React Query Provider (when implemented)
export { QueryClientProviderComponent } from './QueryClientProvider';

// Re-export provider types for convenience
export type {
  Theme
} from '@/types';

/**
 * Combined Providers Component
 * Wraps all providers in the correct order
 */
import React from 'react';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { QueryClientProviderComponent } from './QueryClientProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProviderComponent>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProviderComponent>
  );
}

// Default export for convenience
export default {
  AuthProvider,
  ThemeProvider,
  QueryClientProviderComponent,
  Providers,
};
