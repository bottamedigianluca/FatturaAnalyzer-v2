/**
 * Providers V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Sistema di provider aggiornato per supportare:
 * - Analytics V3.0 Ultra-Optimized con AI/ML
 * - Reconciliation V4.0 Smart Features
 * - Real-time updates e performance monitoring
 * - Error boundaries avanzati
 * - AI features management
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import { 
  useUIStore, 
  useSystemHealth, 
  useAIFeaturesEnabled,
  useSmartReconciliationEnabled,
  enableAllV4Features,
  resetAllStores 
} from '@/store';

// ===== TYPES V4.0 =====
export interface User {
  id: string;
  username: string;
  email?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    aiFeatures?: boolean;
    notifications?: boolean;
  };
  permissions?: string[];
  lastActive?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (prefs: Partial<User['preferences']>) => Promise<void>;
  checkSession: () => Promise<boolean>;
}

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
}

export interface ThemeProviderState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  systemTheme: 'light' | 'dark';
  effectiveTheme: 'light' | 'dark';
}

export type Theme = 'light' | 'dark' | 'system';

// ===== QUERY CLIENT V4.0 =====
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Smart retry logic per V4.0
        if (error?.message?.includes('Backend non raggiungibile')) {
          return failureCount < 3;
        }
        if (error?.message?.includes('AI service unavailable')) {
          return failureCount < 2;
        }
        if (error?.status >= 400 && error?.status < 500) {
          return false; // Non retry per errori client
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (era cacheTime)
      refetchOnMount: true,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
      onError: (error: any) => {
        console.error('🔥 Mutation Error V4.0:', error);
        
        // Notifica errori critici
        if (error?.message?.includes('Backend non raggiungibile')) {
          useUIStore.getState().addNotification({
            type: 'error',
            title: 'Connessione Persa',
            message: 'Backend non raggiungibile. Verificare la connessione.',
            duration: 8000,
          });
        }
      }
    }
  },
});

// Singleton query client
let queryClient: QueryClient;

const getQueryClient = () => {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
};

// ===== AUTH PROVIDER V4.0 =====
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification, updateSystemStatus } = useUIStore();

  // Controllo sessione all'avvio
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
          const user = JSON.parse(userData);
          
          // Validazione token (qui potresti chiamare un endpoint di verifica)
          // const isValid = await validateToken(token);
          
          setUser(user);
          updateSystemStatus({ 
            last_auth_check: new Date().toISOString(),
            user_authenticated: true 
          });
          
          // Abilita features basate su preferenze utente
          if (user.preferences?.aiFeatures !== false) {
            enableAllV4Features();
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
        // Pulisci dati corrotti
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [updateSystemStatus]);

  const login = async (userData: User, token: string) => {
    try {
      setUser(userData);
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      updateSystemStatus({ 
        last_auth_check: new Date().toISOString(),
        user_authenticated: true 
      });
      
      // Abilita features V4.0
      if (userData.preferences?.aiFeatures !== false) {
        enableAllV4Features();
      }
      
      addNotification({
        type: 'success',
        title: 'Login Effettuato',
        message: `Benvenuto ${userData.username}! Features V4.0 attive.`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      // Reset stores
      resetAllStores();
      
      updateSystemStatus({ 
        last_auth_check: new Date().toISOString(),
        user_authenticated: false 
      });
      
      addNotification({
        type: 'info',
        title: 'Logout Effettuato',
        message: 'Arrivederci!',
        duration: 2000,
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updatePreferences = async (prefs: Partial<User['preferences']>) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      preferences: { ...user.preferences, ...prefs }
    };
    
    setUser(updatedUser);
    localStorage.setItem('userData', JSON.stringify(updatedUser));
    
    // Aggiorna features basate su preferenze
    if (prefs.aiFeatures === false) {
      // Disabilita AI features se richiesto
      useUIStore.getState().disableAIFeatures();
    } else if (prefs.aiFeatures === true) {
      enableAllV4Features();
    }
  };

  const checkSession = async (): Promise<boolean> => {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
      // Qui potresti chiamare un endpoint di verifica
      // const response = await fetch('/api/auth/verify', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // return response.ok;
      return true; // Per ora sempre true
    } catch (error) {
      console.error('Session check failed:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updatePreferences,
    checkSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ===== THEME PROVIDER V4.0 =====
const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'fattura-analyzer-theme-v4',
}: ThemeProviderProps) {
  const { theme: storeTheme, setTheme: setStoreTheme } = useUIStore();
  const [theme, setTheme] = useState<Theme>(storeTheme || defaultTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // Rileva tema sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Calcola tema effettivo
  const effectiveTheme = theme === 'system' ? systemTheme : theme;

  // Applica tema al DOM
  useEffect(() => {
    const root = window.document.documentElement;
    
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    
    // Salva nel localStorage
    localStorage.setItem(storageKey, theme);
  }, [effectiveTheme, theme, storageKey]);

  // Sync con store
  useEffect(() => {
    if (storeTheme !== theme) {
      setTheme(storeTheme);
    }
  }, [storeTheme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setStoreTheme(newTheme);
  };

  const value: ThemeProviderState = {
    theme,
    setTheme: handleSetTheme,
    systemTheme,
    effectiveTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ===== SYSTEM HEALTH PROVIDER V4.0 =====
const SystemHealthContext = createContext<{
  isHealthy: boolean;
  lastCheck: string | null;
  features: Record<string, boolean>;
} | undefined>(undefined);

export function SystemHealthProvider({ children }: { children: ReactNode }) {
  const systemHealth = useSystemHealth();
  const aiEnabled = useAIFeaturesEnabled();
  const smartReconciliation = useSmartReconciliationEnabled();

  const value = {
    isHealthy: systemHealth?.data?.backend_healthy || false,
    lastCheck: systemHealth?.data?.last_health_check || null,
    features: {
      ai: aiEnabled,
      smartReconciliation,
      backend: systemHealth?.data?.backend_healthy || false,
    }
  };

  return (
    <SystemHealthContext.Provider value={value}>
      {children}
    </SystemHealthContext.Provider>
  );
}

export const useSystemHealthContext = () => {
  const context = useContext(SystemHealthContext);
  if (!context) {
    throw new Error('useSystemHealthContext must be used within SystemHealthProvider');
  }
  return context;
};

// ===== ERROR BOUNDARY V4.0 =====
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
