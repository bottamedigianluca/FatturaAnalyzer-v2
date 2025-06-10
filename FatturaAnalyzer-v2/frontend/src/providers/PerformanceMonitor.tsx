/**
 * PerformanceMonitor V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Monitora performance queries e connessione di rete
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/store';

// ===== NETWORK STATUS HOOK =====
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
};

// ===== QUERY PERFORMANCE MONITOR HOOK =====
export const useQueryPerformanceMonitor = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();
  
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    
    const unsubscribe = cache.subscribe((event) => {
      if (event?.type === 'queryUpdated') {
        const query = event.query;
        
        // Monitora query lente
        if (query.state.fetchStatus === 'idle' && query.state.dataUpdatedAt) {
          const duration = Date.now() - query.state.dataUpdatedAt;
          
          if (duration > 5000) { // Query che impiega più di 5 secondi
            console.warn('🐌 Slow Query Detected:', {
              queryKey: query.queryKey,
              duration: `${duration}ms`,
              status: query.state.status
            });
            
            // Notifica per query molto lente
            if (duration > 10000) {
              addNotification({
                type: 'warning',
                title: 'Query Lenta',
                message: `Una operazione sta impiegando più tempo del previsto (${Math.round(duration / 1000)}s)`,
                duration: 4000,
              });
            }
          }
        }
        
        // Monitora errori di query
        if (query.state.status === 'error') {
          console.error('❌ Query Error:', {
            queryKey: query.queryKey,
            error: query.state.error,
            errorCount: query.state.errorUpdateCount
          });
        }
      }
    });
    
    return unsubscribe;
  }, [queryClient, addNotification]);
};

// ===== PERFORMANCE MONITOR COMPONENT =====
export const PerformanceMonitor: React.FC<{ children: ReactNode }> = ({ children }) => {
  useQueryPerformanceMonitor();
  const isOnline = useNetworkStatus();
  const { addNotification } = useUIStore();
  
  // Notifica quando si va offline/online
  useEffect(() => {
    if (!isOnline) {
      addNotification({
        type: 'warning',
        title: 'Connessione Persa',
        message: 'Sei offline. Alcune funzionalità potrebbero non essere disponibili.',
        duration: 5000,
      });
    } else {
      // Notifica solo se era offline prima
      const wasOffline = localStorage.getItem('was-offline') === 'true';
      if (wasOffline) {
        addNotification({
          type: 'success',
          title: 'Connessione Ripristinata',
          message: 'Sei di nuovo online!',
          duration: 3000,
        });
        localStorage.removeItem('was-offline');
      }
    }
    
    localStorage.setItem('was-offline', (!isOnline).toString());
  }, [isOnline, addNotification]);
  
  return (
    <>
      {children}
      
      {/* Indicatore offline */}
      {!isOnline && (
        <div className="fixed top-4 right-4 z-50 bg-destructive text-destructive-foreground px-3 py-2 rounded-md shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Offline</span>
          </div>
        </div>
      )}
    </>
  );
};
