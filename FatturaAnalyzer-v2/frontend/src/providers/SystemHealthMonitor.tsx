/**
 * SystemHealthMonitor V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Monitora la salute del sistema e delle performance
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { useUIStore } from '@/store';

// ===== SYSTEM HEALTH MONITOR =====
export const SystemHealthMonitor: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');
  const { addNotification } = useUIStore();
  
  useEffect(() => {
    // Monitora la salute del sistema
    const checkHealth = () => {
      try {
        // Controlla performance
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        
        // Controlla memoria (se disponibile)
        const memory = (performance as any).memory;
        let memoryPressure = false;
        
        if (memory) {
          const usedPercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
          memoryPressure = usedPercent > 0.8; // 80% della memoria utilizzata
        }
        
        // Determina stato salute
        if (loadTime > 5000 || memoryPressure) {
          setHealthStatus('degraded');
          
          if (loadTime > 10000) {
            setHealthStatus('unhealthy');
            addNotification({
              type: 'warning',
              title: 'Performance Degradate',
              message: `Tempo di caricamento elevato: ${Math.round(loadTime)}ms`,
              duration: 5000,
            });
          }
        } else {
          setHealthStatus('healthy');
        }
        
        // Log metriche per debug
        console.log('🏥 System Health Check:', {
          loadTime: Math.round(loadTime),
          memoryPressure,
          status: healthStatus,
          memoryUsage: memory ? `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A'
        });
        
      } catch (error) {
        console.error('Health check failed:', error);
        setHealthStatus('unhealthy');
      }
    };
    
    // Check iniziale
    checkHealth();
    
    // Check periodico ogni 30 secondi
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, [addNotification, healthStatus]);
  
  return (
    <>
      {children}
      
      {/* Indicatore stato salute sistema */}
      {healthStatus !== 'healthy' && (
        <div className={`fixed bottom-4 left-4 z-50 px-3 py-2 rounded-md shadow-lg ${
          healthStatus === 'degraded' 
            ? 'bg-yellow-500 text-yellow-50' 
            : 'bg-red-500 text-red-50'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              healthStatus === 'degraded' ? 'bg-yellow-200' : 'bg-red-200'
            }`}></div>
            <span className="text-sm font-medium">
              Sistema {healthStatus === 'degraded' ? 'Lento' : 'Instabile'}
            </span>
          </div>
        </div>
      )}
    </>
  );
};
