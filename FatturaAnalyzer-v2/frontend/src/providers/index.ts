/**
 * Barrel File for Application Context Providers
 *
 * This file serves as the central export point for all context providers
 * used throughout the application. It also defines the main `Providers`
 * component that wraps the entire app, ensuring providers are nested
 * in the correct order.
 */

import React from 'react';

// Import individual provider components and their related hooks/types
import { AuthProvider, useAuth } from './AuthProvider';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { QueryClientProviderComponent } from './QueryClientProvider'; // This should now contain the real provider logic

// Re-export hooks and types for easy access from other parts of the app
export { useAuth, useTheme };
export type { User, AuthContextType } from './AuthProvider';
export type { ThemeProviderProps, ThemeProviderState } from './ThemeProvider';
export type { Theme } from '@/types';


// --- Main Providers Component ---

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * A single component that wraps the application with all necessary providers.
 * The order is important:
 * 1. QueryClientProviderComponent: Must be outermost to provide data fetching/caching to all children.
 * 2. ThemeProvider: Provides theme state to all visual components.
 * 3. AuthProvider: Provides authentication state and methods.
 *
 * @param {ProvidersProps} props - The component props.
 * @returns {React.ReactElement} The children wrapped in all providers.
 */
export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <QueryClientProviderComponent>
      <ThemeProvider defaultTheme="system" storageKey="fattura-analyzer-theme">
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProviderComponent>
  );
}

// Default export for convenience, although direct imports are preferred
export default {
  AuthProvider,
  ThemeProvider,
  QueryClientProviderComponent,
  Providers,
};
