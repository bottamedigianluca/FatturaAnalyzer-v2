// Path: frontend/src/providers/AuthProvider.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface User { id: string; username: string; }
interface AuthContextType { user: User | null; isAuthenticated: boolean; login: (userData: User, token: string) => Promise<void>; logout: () => Promise<void>; isLoading: boolean; }
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      // Example: const token = localStorage.getItem('authToken'); if (token) { /* Validate token, fetch user */ }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  const login = async (userData: User, token: string) => { setUser(userData); /* localStorage.setItem('authToken', token); */ };

  const logout = async () => { setUser(null); /* localStorage.removeItem('authToken'); */ };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};
