/**
 * Theme Provider V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Provider per gestione tema con features avanzate:
 * - Auto-detection del tema sistema
 * - Smooth transitions
 * - Color scheme preferences
 * - Accessibility enhancements
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUIStore } from '@/store';

// ===== TYPES V4.0 =====
export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableTransitions?: boolean;
  respectMotionPreferences?: boolean;
}

export interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: 'light' | 'dark';
  effectiveTheme: 'light' | 'dark';
  isSystemTheme: boolean;
  toggleTheme: () => void;
  cycleTheme: () => void;
  applyTheme: (theme: 'light' | 'dark') => void;
  getThemeColors: () => ThemeColors;
  supportsSystemTheme: boolean;
}

export type Theme = 'light' | 'dark' | 'system' | 'auto';

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  border: string;
  destructive: string;
  warning: string;
  success: string;
  info: string;
}

// ===== THEME CONTEXT =====
const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

// ===== THEME PROVIDER V4.0 =====
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'fattura-analyzer-theme-v4',
  enableTransitions = true,
  respectMotionPreferences = true,
}: ThemeProviderProps) {
  const { theme: storeTheme, setTheme: setStoreTheme } = useUIStore();
  const [theme, setTheme] = useState<Theme>(storeTheme || defaultTheme);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [supportsSystemTheme, setSupportsSystemTheme] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Rileva supporto per tema sistema
  useEffect(() => {
    setSupportsSystemTheme(typeof window !== 'undefined' && 'matchMedia' in window);
  }, []);

  // Rileva tema sistema
  useEffect(() => {
    if (!supportsSystemTheme) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
      
      // Se il tema è 'auto', aggiorna automaticamente
      if (theme === 'auto') {
        applyThemeToDOM(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [supportsSystemTheme, theme]);

  // Calcola tema effettivo
  const effectiveTheme: 'light' | 'dark' = React.useMemo(() => {
    switch (theme) {
      case 'system':
      case 'auto':
        return systemTheme;
      case 'light':
      case 'dark':
        return theme;
      default:
        return 'light';
    }
  }, [theme, systemTheme]);

  // Applica tema al DOM
  const applyThemeToDOM = React.useCallback((targetTheme: 'light' | 'dark') => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    
    // Gestione transizioni smooth
    if (enableTransitions && !isTransitioning) {
      setIsTransitioning(true);
      
      // Verifica preferenze motion dell'utente
      const prefersReducedMotion = respectMotionPreferences && 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      if (!prefersReducedMotion) {
        root.style.transition = 'color 0.3s ease, background-color 0.3s ease';
      }
      
      // Rimuovi transizione dopo il cambio
      setTimeout(() => {
        root.style.removeProperty('transition');
        setIsTransitioning(false);
      }, 300);
    }
    
    // Applica classi tema
    root.classList.remove('light', 'dark');
    root.classList.add(targetTheme);
    
    // Aggiorna meta theme-color per PWA
    updateMetaThemeColor(targetTheme);
    
    // Salva nel localStorage
    localStorage.setItem(storageKey, theme);
  }, [theme, enableTransitions, isTransitioning, respectMotionPreferences, storageKey]);

  // Aggiorna meta theme-color
  const updateMetaThemeColor = (targetTheme: 'light' | 'dark') => {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const colors = getThemeColors();
    
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', colors.background);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = colors.background;
      document.head.appendChild(meta);
    }
  };

  // Applica tema quando cambia
  useEffect(() => {
    applyThemeToDOM(effectiveTheme);
  }, [effectiveTheme, applyThemeToDOM]);

  // Sync con store
  useEffect(() => {
    if (storeTheme !== theme) {
      setTheme(storeTheme);
    }
  }, [storeTheme]);

  // Carica tema dal localStorage all'avvio
  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey) as Theme;
    if (savedTheme && savedTheme !== theme) {
      setTheme(savedTheme);
      setStoreTheme(savedTheme);
    }
  }, [storageKey, setStoreTheme]);

  // Handler per cambio tema
  const handleSetTheme = React.useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    setStoreTheme(newTheme);
    localStorage.setItem(storageKey, newTheme);
  }, [setStoreTheme, storageKey]);

  // Toggle tra light e dark
  const toggleTheme = React.useCallback(() => {
    const newTheme = effectiveTheme === 'light' ? 'dark' : 'light';
    handleSetTheme(newTheme);
  }, [effectiveTheme, handleSetTheme]);

  // Cicla tra tutti i temi disponibili
  const cycleTheme = React.useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    handleSetTheme(themes[nextIndex]);
  }, [theme, handleSetTheme]);

  // Applica tema specifico
  const applyTheme = React.useCallback((targetTheme: 'light' | 'dark') => {
    handleSetTheme(targetTheme);
  }, [handleSetTheme]);

  // Ottieni colori del tema corrente
  const getThemeColors = React.useCallback((): ThemeColors => {
    const isDark = effectiveTheme === 'dark';
    
    return {
      background: isDark ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)',
      foreground: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
      primary: isDark ? 'hsl(217.2 91.2% 59.8%)' : 'hsl(221.2 83.2% 53.3%)',
      secondary: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(210 40% 96%)',
      accent: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(210 40% 96%)',
      muted: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(210 40% 96%)',
      border: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
      destructive: isDark ? 'hsl(0 62.8% 30.6%)' : 'hsl(0 84.2% 60.2%)',
      warning: isDark ? 'hsl(38 92% 50%)' : 'hsl(43 74% 66%)',
      success: isDark ? 'hsl(142 71% 45%)' : 'hsl(142 76% 36%)',
      info: isDark ? 'hsl(198 93% 60%)' : 'hsl(198 93% 60%)',
    };
  }, [effectiveTheme]);

  // Gestione keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + T per toggle tema
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        toggleTheme();
      }
      
      // Ctrl/Cmd + Shift + Y per cycle temi
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Y') {
        event.preventDefault();
        cycleTheme();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [toggleTheme, cycleTheme]);

  // Context value
  const value: ThemeProviderState = {
    theme,
    setTheme: handleSetTheme,
    systemTheme,
    effectiveTheme,
    isSystemTheme: theme === 'system' || theme === 'auto',
    toggleTheme,
    cycleTheme,
    applyTheme,
    getThemeColors,
    supportsSystemTheme,
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// ===== HOOK =====
export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ===== UTILITY HOOKS =====

/**
 * Hook per ottenere solo il tema effettivo
 */
export const useEffectiveTheme = (): 'light' | 'dark' => {
  const { effectiveTheme } = useTheme();
  return effectiveTheme;
};

/**
 * Hook per verificare se il tema è dark
 */
export const useIsDarkTheme = (): boolean => {
  const { effectiveTheme } = useTheme();
  return effectiveTheme === 'dark';
};

/**
 * Hook per ottenere colori del tema
 */
export const useThemeColors = (): ThemeColors => {
  const { getThemeColors } = useTheme();
  return getThemeColors();
};
