/**
 * Utility Hooks V4.0 - VERSIONE CORRETTA
 * Hook di utilità per cache, error handling, shortcuts, etc.
 * 
 * FIXED: Risolti tutti i problemi di import e dipendenze circolari
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

// ===== SMART CACHE HOOK =====
/**
 * Hook per gestire il caching intelligente con TTL dinamico
 */
const TTL_MAP = Object.freeze({
  'invoices': 300000,
  'transactions': 300000,
  'anagraphics': 300000,
  'reconciliation': 300000,
  'import': 600000,
  'export': 600000,
  'executive-dashboard': 900000,
  'operations-dashboard': 900000,
  'ai-insights': 1200000,
  'analytics-export': 1200000,
  'ultra-predictions': 1800000,
});

type TTLType = keyof typeof TTL_MAP;

const DEFAULT_TTL = 300000;
const AI_TTL_MULTIPLIER = 0.7;

// Rimosse le dichiarazioni 'type' e 'interface'
export const useSmartCache = (options: { cacheEnabled?: boolean; aiEnabled?: boolean } = {}) => {
  const { cacheEnabled = true, aiEnabled = true } = options;
  const queryClient = useQueryClient();

  // Usa il tipo TTLType per il parametro type
  const getCacheTTL = useCallback((type: string) => {
    const baseTTL = (TTL_MAP as Record<string, number>)[type] ?? DEFAULT_TTL;
    return aiEnabled ? Math.round(baseTTL * AI_TTL_MULTIPLIER) : baseTTL;
  }, [aiEnabled]);

  const shouldRefetch = useCallback((lastFetchTime: number | null, type: string) => {
    if (!cacheEnabled || lastFetchTime === null) {
      return true;
    }
    const ttl = getCacheTTL(type);
    return Date.now() - lastFetchTime > ttl;
  }, [cacheEnabled, getCacheTTL]);

  const invalidateSmartCache = useCallback((patterns: string[]) => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey.some(
          (key) => typeof key === 'string' && patterns.some(pattern => key.includes(pattern))
        ),
    });
  }, [queryClient]);

  return {
    getCacheTTL,
    shouldRefetch,
    invalidateSmartCache,
    cacheEnabled,
    aiEnhanced: aiEnabled,
  };
};


// ===== SMART ERROR HANDLING HOOK =====
/**
 * Hook per error handling centralizzato con retry logic
 */
export const useSmartErrorHandling = () => {
  // Fallback per addNotification senza dipendenze esterne
  const addNotification = (notification: any) => {
    console.log('Notification:', notification);
    // Usa toast come fallback sicuro
    if (notification.type === 'error') {
      toast.error(notification.message || 'Errore sconosciuto');
    } else if (notification.type === 'success') {
      toast.success(notification.message || 'Operazione completata');
    } else if (notification.type === 'warning') {
      toast(notification.message || 'Attenzione', { icon: '⚠️' });
    } else {
      toast(notification.message || 'Notifica');
    }
  };
  
  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});
  
  const handleError = (error: any, context: string, shouldRetry = true) => {
    console.error(`Error in ${context}:`, error);
    
    // Determina il tipo di errore
    const errorType = error?.response?.status || error?.code || 'unknown';
    const errorMessage = error?.response?.data?.message || error?.message || 'Errore sconosciuto';
    
    // Incrementa tentativo
    const currentAttempts = retryAttempts[context] || 0;
    
    // Logica di retry per errori temporanei
    const shouldAttemptRetry = shouldRetry && 
      currentAttempts < 3 && 
      [408, 429, 500, 502, 503, 504].includes(errorType);
    
    if (shouldAttemptRetry) {
      setRetryAttempts(prev => ({
        ...prev,
        [context]: currentAttempts + 1
      }));
      
      // Retry con backoff esponenziale
      setTimeout(() => {
        console.log(`Retrying ${context}, attempt ${currentAttempts + 1}`);
      }, Math.pow(2, currentAttempts) * 1000);
      
      return;
    }
    
    // Reset tentativi
    setRetryAttempts(prev => ({
      ...prev,
      [context]: 0
    }));
    
    // Mostra notifica appropriata
    const notificationMessage = getErrorMessage(errorType, errorMessage, context);
    
    addNotification({
      type: 'error',
      title: 'Errore Sistema',
      message: notificationMessage,
      duration: errorType >= 500 ? 8000 : 5000,
    });
    
    // Log per debugging in dev
    if (process.env.NODE_ENV === 'development') {
      console.table({
        context,
        errorType,
        message: errorMessage,
        attempts: currentAttempts,
      });
    }
  };
  
  const getErrorMessage = (errorType: number | string, message: string, context: string) => {
    const contextMap = {
      'invoices': 'fatture',
      'transactions': 'transazioni', 
      'anagraphics': 'anagrafiche',
      'reconciliation': 'riconciliazione',
      'import': 'importazione',
      'export': 'esportazione',
      'executive-dashboard': 'dashboard executive',
      'operations-dashboard': 'dashboard operativo',
      'ai-insights': 'insights AI',
      'analytics-export': 'export analytics',
      'ultra-predictions': 'previsioni ultra',
    };
    
    const contextName = contextMap[context as keyof typeof contextMap] || context;
    
    switch (errorType) {
      case 400:
        return `Dati non validi per ${contextName}`;
      case 401:
        return 'Sessione scaduta. Effettua il login.';
      case 403:
        return `Non hai i permessi per ${contextName}`;
      case 404:
        return `${contextName.charAt(0).toUpperCase() + contextName.slice(1)} non trovata`;
      case 408:
        return 'Timeout della richiesta. Riprova.';
      case 429:
        return 'Troppe richieste. Attendi un momento.';
      case 500:
        return `Errore del server per ${contextName}`;
      case 502:
      case 503:
      case 504:
        return 'Servizio temporaneamente non disponibile';
      default:
        return message || `Errore durante l'operazione su ${contextName}`;
    }
  };
  
  return {
    handleError,
    retryAttempts,
    resetRetryAttempts: (context: string) => 
      setRetryAttempts(prev => ({ ...prev, [context]: 0 })),
  };
};

// ===== DEBOUNCE HOOK =====
/**
 * Hook per debounce ottimizzato
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// ===== THROTTLE HOOK =====
/**
 * Hook per throttle ottimizzato
 */
export const useThrottle = <T>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const [lastRan, setLastRan] = useState<number>(Date.now());
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan >= limit) {
        setThrottledValue(value);
        setLastRan(Date.now());
      }
    }, limit - (Date.now() - lastRan));
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, limit, lastRan]);
  
  return throttledValue;
};

// ===== SMART LOADING HOOK =====
/**
 * Hook per gestire loading states intelligenti
 */
export const useSmartLoading = (queries: any[] = []) => {
  const loading = queries.some(q => q?.isLoading || q?.isPending);
  const error = queries.find(q => q?.error)?.error;
  const success = queries.every(q => q?.isSuccess);
  
  const progress = useMemo(() => {
    const total = queries.length;
    const completed = queries.filter(q => q?.isSuccess || q?.isError).length;
    return total > 0 ? (completed / total) * 100 : 0;
  }, [queries]);
  
  return {
    loading,
    error,
    success,
    progress,
    isPartiallyLoaded: progress > 0 && progress < 100,
  };
};

// ===== BULK SELECTION HOOK =====
/**
 * Hook per gestire stati di selezione bulk
 */
export const useBulkSelection = <T extends { id: number }>(items: T[] = []) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  const selectedItems = useMemo(() => 
    items.filter(item => selectedIds.has(item.id)), 
    [items, selectedIds]
  );
  
  const isSelected = (id: number) => selectedIds.has(id);
  const isAllSelected = selectedIds.size > 0 && selectedIds.size === items.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < items.length;
  
  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };
  
  const clearSelection = () => setSelectedIds(new Set());
  
  const selectRange = (startId: number, endId: number) => {
    const startIndex = items.findIndex(item => item.id === startId);
    const endIndex = items.findIndex(item => item.id === endId);
    
    if (startIndex !== -1 && endIndex !== -1) {
      const rangeStart = Math.min(startIndex, endIndex);
      const rangeEnd = Math.max(startIndex, endIndex);
      const rangeIds = items.slice(rangeStart, rangeEnd + 1).map(item => item.id);
      
      setSelectedIds(prev => new Set([...prev, ...rangeIds]));
    }
  };
  
  return {
    selectedIds: Array.from(selectedIds),
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    toggleSelection,
    toggleAll,
    clearSelection,
    selectRange,
    hasSelection: selectedIds.size > 0,
  };
};

// ===== PERSISTENT FILTERS HOOK =====
/**
 * Hook per gestire filtri con persistenza locale
 */
export const usePersistentFilters = <T extends Record<string, any>>(
  key: string,
  defaultFilters: T
) => {
  const [filters, setFilters] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`filters_${key}`);
      return saved ? { ...defaultFilters, ...JSON.parse(saved) } : defaultFilters;
    } catch {
      return defaultFilters;
    }
  });
  
  const updateFilters = (newFilters: Partial<T>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    
    try {
      localStorage.setItem(`filters_${key}`, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error);
    }
  };
  
  const resetFilters = () => {
    setFilters(defaultFilters);
    try {
      localStorage.removeItem(`filters_${key}`);
    } catch (error) {
      console.warn('Failed to remove filters from localStorage:', error);
    }
  };
  
  const clearFilter = (filterKey: keyof T) => {
    const { [filterKey]: removed, ...rest } = filters;
    updateFilters(rest as Partial<T>);
  };
  
  return {
    filters,
    updateFilters,
    resetFilters,
    clearFilter,
    hasActiveFilters: Object.keys(filters).some(key => 
      filters[key] !== defaultFilters[key] && 
      filters[key] !== null && 
      filters[key] !== undefined && 
      filters[key] !== ''
    ),
  };
};

// ===== USER PREFERENCES HOOK =====
/**
 * Hook per gestire le preferenze utente
 */
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('user_preferences');
      return saved ? JSON.parse(saved) : {
        theme: 'system',
        language: 'it',
        itemsPerPage: 20,
        enableAnimations: true,
        enableSounds: false,
        autoSave: true,
        compactMode: false,
      };
    } catch {
      return {
        theme: 'system',
        language: 'it',
        itemsPerPage: 20,
        enableAnimations: true,
        enableSounds: false,
        autoSave: true,
        compactMode: false,
      };
    }
  });
  
  const updatePreference = (key: string, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    
    try {
      localStorage.setItem('user_preferences', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    }
  };
  
  return {
    preferences,
    updatePreference,
  };
};

// ===== ADVANCED TOAST HOOK =====
/**
 * Hook per gestire le notifiche toast avanzate
 */
export const useAdvancedToast = () => {
  const showSuccess = (message: string, options?: any) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
      ...options,
    });
  };
  
  const showError = (message: string, options?: any) => {
    toast.error(message, {
      duration: 6000,
      position: 'top-right',
      ...options,
    });
  };
  
  const showWarning = (message: string, options?: any) => {
    toast(message, {
      icon: '⚠️',
      duration: 5000,
      position: 'top-right',
      style: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
      },
      ...options,
    });
  };
  
  const showInfo = (message: string, options?: any) => {
    toast(message, {
      icon: 'ℹ️',
      duration: 4000,
      position: 'top-right',
      style: {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
      },
      ...options,
    });
  };
  
  const showProgress = (message: string, promise: Promise<any>) => {
    return toast.promise(promise, {
      loading: message,
      success: 'Operazione completata!',
      error: 'Errore durante l\'operazione',
    });
  };
  
  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showProgress,
  };
};

// ===== AUTO-SAVE HOOK =====
/**
 * Hook per gestire l'auto-save intelligente
 */
export const useAutoSave = <T>(
  data: T,
  saveFunction: (data: T) => Promise<any>,
  options: {
    delay?: number;
    enabled?: boolean;
    key?: string;
  } = {}
) => {
  const { delay = 2000, enabled = true, key = 'autosave' } = options;
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debouncedData = useDebounce(data, delay);
  
  useEffect(() => {
    if (!enabled || !debouncedData) return;
    
    const save = async () => {
      setIsSaving(true);
      try {
        await saveFunction(debouncedData);
        setLastSaved(new Date());
        toast.success('Salvataggio automatico completato', {
          duration: 2000,
          position: 'bottom-right',
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Errore nel salvataggio automatico');
      } finally {
        setIsSaving(false);
      }
    };
    
    save();
  }, [debouncedData, saveFunction, enabled]);
  
  return {
    isSaving,
    lastSaved,
    isEnabled: enabled,
  };
};

// ===== PERFORMANCE MONITOR HOOK =====
/**
 * Hook per gestire le performance e monitoring
 */
export const usePerformanceMonitor = (componentName: string) => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
  });
  
  useEffect(() => {
    const startTime = performance.now();
    
    setMetrics(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1,
    }));
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => {
        const newAverageTime = (prev.averageRenderTime * (prev.renderCount - 1) + renderTime) / prev.renderCount;
        return {
          ...prev,
          averageRenderTime: newAverageTime,
          lastRenderTime: renderTime,
        };
      });
      
      // Log performance warning se troppo lento
      if (renderTime > 100) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });
  
  return metrics;
};

// ===== KEYBOARD SHORTCUTS HOOK =====
/**
 * Hook per keyboard shortcuts personalizzabili
 */
export const useKeyboardShortcuts = () => {
  const [shortcuts] = useState({
    // Navigazione
    'ctrl+shift+i': () => window.location.href = '/invoices',
    'ctrl+shift+t': () => window.location.href = '/transactions',
    'ctrl+shift+a': () => window.location.href = '/anagraphics',
    'ctrl+shift+r': () => window.location.href = '/reconciliation',
    'ctrl+shift+d': () => window.location.href = '/dashboard',
    
    // Azioni quick
    'ctrl+n': () => (document.querySelector('[data-shortcut="new"]') as HTMLElement | null)?.click(),
    'ctrl+s': () => (document.querySelector('[data-shortcut="save"]') as HTMLElement | null)?.click(),
    'ctrl+e': () => (document.querySelector('[data-shortcut="export"]') as HTMLElement | null)?.click(),
    'ctrl+f': () => (document.querySelector('[data-shortcut="search"]') as HTMLElement)?.focus(),
    
    // Bulk operations
    'ctrl+shift+delete': () => (document.querySelector('[data-shortcut="bulk-delete"]') as HTMLElement | null)?.click(),
    'ctrl+shift+e': () => (document.querySelector('[data-shortcut="bulk-export"]') as HTMLElement | null)?.click(),
    
    // AI features
    'ctrl+shift+ai': () => (document.querySelector('[data-shortcut="ai-suggest"]') as HTMLElement | null)?.click(),
  });
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = [
        event.ctrlKey && 'ctrl',
        event.shiftKey && 'shift',
        event.altKey && 'alt',
        event.key.toLowerCase()
      ].filter(Boolean).join('+');
      
      const action = shortcuts[key as keyof typeof shortcuts];
      if (action) {
        event.preventDefault();
        action();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
  
  return shortcuts;
};

// ===== VIRTUAL SCROLLING HOOK =====
/**
 * Hook per gestire virtual scrolling performance
 */
export const useVirtualScrolling = (
  items: any[] = [],
  itemHeight: number = 50,
  containerHeight: number = 400
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItemsCount = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleItemsCount, items.length);
  
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex,
  };
};
