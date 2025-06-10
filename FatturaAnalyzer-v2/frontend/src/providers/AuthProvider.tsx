/**
 * Auth Provider V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Provider di autenticazione con features avanzate:
 * - Session management intelligente
 * - User preferences persistence
 * - Security enhancements
 * - V4.0 features integration
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUIStore, enableAllV4Features } from '@/store';

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
    smartReconciliation?: boolean;
    realTimeUpdates?: boolean;
  };
  permissions?: string[];
  lastActive?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    role?: string;
    avatar?: string;
  };
  settings?: {
    dashboardLayout?: string;
    defaultView?: string;
    autoSave?: boolean;
    analyticsLevel?: 'basic' | 'standard' | 'advanced';
  };
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (prefs: Partial<User['preferences']>) => Promise<void>;
  updateProfile: (profile: Partial<User['profile']>) => Promise<void>;
  updateSettings: (settings: Partial<User['settings']>) => Promise<void>;
  checkSession: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

// ===== AUTH CONTEXT =====
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===== AUTH PROVIDER V4.0 =====
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
          const isValid = await validateToken(token);
          
          if (isValid) {
            setUser(user);
            updateSystemStatus({ 
              last_auth_check: new Date().toISOString(),
              user_authenticated: true 
            });
            
            // Abilita features basate su preferenze utente V4.0
            if (user.preferences?.aiFeatures !== false) {
              enableAllV4Features();
            }
            
            // Auto-refresh token se necessario
            scheduleTokenRefresh();
          } else {
            // Token non valido, pulisci dati
            await logout();
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

  // Validazione token
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      // Qui potresti chiamare un endpoint di verifica
      // const response = await fetch('/api/auth/verify', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // return response.ok;
      
      // Per ora simuliamo la validazione
      const tokenData = parseJWT(token);
      if (!tokenData) return false;
      
      // Controllo scadenza
      const now = Date.now() / 1000;
      return tokenData.exp > now;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  };

  // Parse JWT token
  const parseJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  // Programmazione refresh token
  const scheduleTokenRefresh = () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    
    const tokenData = parseJWT(token);
    if (!tokenData) return;
    
    // Refresh 5 minuti prima della scadenza
    const refreshTime = (tokenData.exp * 1000) - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      setTimeout(async () => {
        await refreshToken();
      }, refreshTime);
    }
  };

  // Login
  const login = async (userData: User, token: string) => {
    try {
      setUser(userData);
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      updateSystemStatus({ 
        last_auth_check: new Date().toISOString(),
        user_authenticated: true 
      });
      
      // Abilita features V4.0 basate su preferenze
      if (userData.preferences?.aiFeatures !== false) {
        enableAllV4Features();
      }
      
      // Programma refresh token
      scheduleTokenRefresh();
      
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

  // Logout
  const logout = async () => {
    try {
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('refreshToken');
      
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

  // Aggiorna preferenze
  const updatePreferences = async (prefs: Partial<User['preferences']>) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      preferences: { ...user.preferences, ...prefs }
    };
    
    setUser(updatedUser);
    localStorage.setItem('userData', JSON.stringify(updatedUser));
    
    // Aggiorna features basate su preferenze V4.0
    if (prefs.aiFeatures === false) {
      useUIStore.getState().disableAIFeatures();
    } else if (prefs.aiFeatures === true) {
      enableAllV4Features();
    }
    
    if (prefs.smartReconciliation !== undefined) {
      useUIStore.getState().updateSettings({
        smart_reconciliation_enabled: prefs.smartReconciliation
      });
    }
    
    if (prefs.realTimeUpdates !== undefined) {
      useUIStore.getState().setRealTimeUpdates(prefs.realTimeUpdates);
    }
  };

  // Aggiorna profilo
  const updateProfile = async (profile: Partial<User['profile']>) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      profile: { ...user.profile, ...profile }
    };
    
    setUser(updatedUser);
    localStorage.setItem('userData', JSON.stringify(updatedUser));
  };

  // Aggiorna impostazioni
  const updateSettings = async (settings: Partial<User['settings']>) => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      settings: { ...user.settings, ...settings }
    };
    
    setUser(updatedUser);
    localStorage.setItem('userData', JSON.stringify(updatedUser));
  };

  // Controllo sessione
  const checkSession = async (): Promise<boolean> => {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    return await validateToken(token);
  };

  // Refresh token
  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const currentToken = localStorage.getItem('authToken');
      
      if (!refreshToken || !currentToken) return false;
      
      // Qui chiameresti l'endpoint di refresh
      // const response = await fetch('/api/auth/refresh', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${currentToken}`
      //   },
      //   body: JSON.stringify({ refreshToken })
      // });
      
      // Simulazione per ora
      const isValid = await validateToken(currentToken);
      if (isValid) {
        scheduleTokenRefresh();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  // Controllo permessi
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission) || user.permissions.includes('admin');
  };

  // Controllo permessi multipli (OR)
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.some(permission => hasPermission(permission));
  };

  // Context value
  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updatePreferences,
    updateProfile,
    updateSettings,
    checkSession,
    refreshToken,
    hasPermission,
    hasAnyPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ===== HOOK =====
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
