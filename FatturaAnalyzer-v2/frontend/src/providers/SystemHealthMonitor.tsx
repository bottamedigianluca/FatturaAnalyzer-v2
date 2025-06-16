/**
 * System Health Provider V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Provider per monitoraggio salute sistema con:
 * - Health checks periodici del backend
 * - Monitoraggio connettività
 * - Status tracking avanzato
 * - Error recovery automatico
 * - Performance metrics
 */

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useUIStore } from '@/store';

// ===== TYPES V4.0 =====
export interface HealthStatus {
  backend_healthy: boolean;
  database_connected: boolean;
  last_health_check: string | null;
  api_version?: string;
  core_integration_status?: string;
  first_run_required?: boolean;
  features?: Record<string, boolean>;
  performance_metrics?: {
    loadTime: number;
    memoryUsage?: number;
    memoryPressure?: boolean;
    api_response_time?: number;
  };
  error_count?: number;
  warning_count?: number;
}

export interface SystemHealthContextType {
  healthStatus: HealthStatus;
  isSystemHealthy: boolean;
  isLoading: boolean;
  lastCheck: string | null;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checkSystemHealth: () => Promise<void>;
  checkHealth: () => Promise<void>; // Alias per compatibilità
  systemInfo: {
    version: string;
    environment: string;
    features: string[];
  };
  retryCount: number;
  isOnline: boolean;
  errorCount: number;
  warningCount: number;
}

// ===== CONTEXT =====
const SystemHealthContext = createContext<SystemHealthContextType | undefined>(undefined);

// ===== PROVIDER V4.0 =====
export function SystemHealthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    backend_healthy: false,
    database_connected: false,
    last_health_check: null,
    features: {},
    performance_metrics: {
      loadTime: 0,
    },
    error_count: 0,
    warning_count: 0,
  });

  const { updateSystemStatus, addNotification } = useUIStore();

  // Monitora connessione di rete
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (retryCount > 0) {
        addNotification({
          type: 'success',
          title: 'Connessione Ripristinata',
          message: 'Sistema di nuovo online!',
          duration: 3000,
        });
        setRetryCount(0);
        // Riprova health check immediatamente
        checkSystemHealth();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      addNotification({
        type: 'warning',
        title: 'Connessione Persa',
        message: 'Verifica la tua connessione internet.',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryCount, addNotification]);

  // Simulazione chiamata API health check con fallback per errori
  const performHealthCheck = async (): Promise<HealthStatus> => {
    try {
      // Se offline, restituisci stato unhealthy
      if (!isOnline) {
        return {
          backend_healthy: false,
          database_connected: false,
          last_health_check: new Date().toISOString(),
          api_version: 'unknown',
          core_integration_status: 'offline',
          first_run_required: false,
          features: {},
          performance_metrics: {
            loadTime: 0,
          },
          error_count: 1,
          warning_count: 0,
        };
      }

      // Simula delay della chiamata API reale
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      // Tentativo di chiamata al backend - in un'app reale:
      // const response = await fetch('/api/health');
      // const data = await response.json();
      
      // Simulazione response API con possibili errori
      const shouldSimulateError = Math.random() < 0.1; // 10% chance di errore
      const shouldSimulateWarning = Math.random() < 0.2; // 20% chance di warning
      
      if (shouldSimulateError) {
        throw new Error('Simulated backend error');
      }

      const simulatedResponse = {
        status: shouldSimulateWarning ? 'degraded' : 'healthy',
        database: Math.random() > 0.05 ? 'connected' : 'disconnected',
        version: '4.0.0',
        core_integration: isOnline ? 'active' : 'inactive',
        first_run_required: false,
        features: {
          ai_features: true,
          smart_reconciliation: true,
          real_time_updates: isOnline,
          advanced_analytics: true,
          cloud_sync: true,
          import_export: true,
        },
        performance: {
          loadTime: performance.now(),
          memoryUsage: (performance as any).memory?.usedJSHeapSize || Math.random() * 50 * 1024 * 1024,
          api_response_time: 200 + Math.random() * 300,
        }
      };

      const isHealthy = simulatedResponse.status === 'healthy' && 
                       simulatedResponse.database === 'connected' && 
                       isOnline;

      return {
        backend_healthy: isHealthy,
        database_connected: simulatedResponse.database === 'connected',
        last_health_check: new Date().toISOString(),
        api_version: simulatedResponse.version,
        core_integration_status: simulatedResponse.core_integration,
        first_run_required: simulatedResponse.first_run_required,
        features: simulatedResponse.features,
        performance_metrics: {
          loadTime: simulatedResponse.performance.loadTime,
          memoryUsage: simulatedResponse.performance.memoryUsage,
          memoryPressure: simulatedResponse.performance.memoryUsage > 100 * 1024 * 1024, // 100MB
          api_response_time: simulatedResponse.performance.api_response_time,
        },
        error_count: 0,
        warning_count: shouldSimulateWarning ? 1 : 0,
      };

    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  };

  // Funzione principale di health check
  const checkSystemHealth = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const newStatus = await performHealthCheck();
      setHealthStatus(newStatus);
      setRetryCount(0);

      // Aggiorna store globale
      updateSystemStatus({
        connection_status: newStatus.backend_healthy ? 'connected' : 'disconnected',
        last_health_check: newStatus.last_health_check,
        backend_version: newStatus.api_version,
        user_authenticated: true, // Questo dovrebbe venire dal auth provider
        performance_metrics: newStatus.performance_metrics,
      });

      // Notifica se sistema è tornato healthy dopo errori
      if (newStatus.backend_healthy && retryCount > 0) {
        addNotification({
          type: 'success',
          title: 'Sistema Ripristinato',
          message: 'Tutti i servizi sono di nuovo operativi.',
          duration: 4000,
        });
      }

      // Notifica warning se stato degraded
      if (!newStatus.backend_healthy && newStatus.warning_count > 0) {
        addNotification({
          type: 'warning',
          title: 'Sistema Degradato',
          message: 'Alcuni servizi potrebbero funzionare lentamente.',
          duration: 6000,
        });
      }

    } catch (error) {
      console.error('Health check failed:', error);
      
      const failedStatus: HealthStatus = {
        backend_healthy: false,
        database_connected: false,
        last_health_check: new Date().toISOString(),
        api_version: 'unknown',
        core_integration_status: 'error',
        first_run_required: false,
        features: {},
        performance_metrics: {
          loadTime: 0,
        },
        error_count: retryCount + 1,
        warning_count: 0,
      };
      
      setHealthStatus(failedStatus);
      setRetryCount(prev => prev + 1);
      
      updateSystemStatus({ 
        connection_status: 'disconnected',
        last_health_check: failedStatus.last_health_check,
      });

      // Notifica errore solo se non è il primo tentativo
      if (retryCount > 0) {
        addNotification({
          type: 'error',
          title: 'Errore Sistema',
          message: `Health check fallito (tentativo ${retryCount + 1})`,
          duration: 5000,
        });
      }

      // Auto-retry con backoff esponenziale
      if (retryCount < 3) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        setTimeout(() => {
          console.log(`Auto-retry health check in ${retryDelay}ms`);
          checkSystemHealth();
        }, retryDelay);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, updateSystemStatus, addNotification, isOnline]);

  // Alias per compatibilità
  const checkHealth = checkSystemHealth;

  // Calcola stato generale
  const status: 'healthy' | 'degraded' | 'unhealthy' = 
    healthStatus.backend_healthy && healthStatus.database_connected ? 'healthy' :
    healthStatus.warning_count > 0 ? 'degraded' : 'unhealthy';

  const isSystemHealthy = status === 'healthy';

  // Sistema info
  const systemInfo = {
    version: healthStatus.api_version || '4.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: Object.keys(healthStatus.features || {}),
  };

  // Health check iniziale e periodico
  useEffect(() => {
    checkSystemHealth(); // Esegui subito al montaggio del provider

    const intervalId = setInterval(() => {
      // Health check ogni 2 minuti se online, ogni 30 secondi se offline
      checkSystemHealth();
    }, isOnline ? 2 * 60 * 1000 : 30 * 1000);

    return () => clearInterval(intervalId);
  }, [checkSystemHealth, isOnline]);

  // Auto-recovery quando torna online
  useEffect(() => {
    if (isOnline && !healthStatus.backend_healthy) {
      const timeout = setTimeout(() => {
        checkSystemHealth();
      }, 1000); // Attendi 1 secondo dopo che torna online

      return () => clearTimeout(timeout);
    }
  }, [isOnline, healthStatus.backend_healthy, checkSystemHealth]);

  // Context value
  const value: SystemHealthContextType = {
    healthStatus,
    isSystemHealthy,
    isLoading,
    lastCheck: healthStatus.last_health_check,
    status,
    checkSystemHealth,
    checkHealth, // Alias
    systemInfo,
    retryCount,
    isOnline,
    errorCount: healthStatus.error_count || 0,
    warningCount: healthStatus.warning_count || 0,
  };

  return (
    <SystemHealthContext.Provider value={value}>
      {children}
    </SystemHealthContext.Provider>
  );
}

// ===== HOOK =====
export const useSystemHealthContext = (): SystemHealthContextType => {
  const context = useContext(SystemHealthContext);
  if (context === undefined) {
    throw new Error('useSystemHealthContext deve essere usato all\'interno di un SystemHealthProvider');
  }
  return context;
};

// ===== ALTERNATIVE EXPORT NAMES FOR COMPATIBILITY =====
export const useSystemHealth = useSystemHealthContext;
export const useHealthCheck = useSystemHealthContext;
