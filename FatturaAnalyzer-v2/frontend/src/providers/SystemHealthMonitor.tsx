/**
 * SystemHealthMonitor V4.0 Ultra-Enhanced for FatturaAnalyzer
 * Componente per visualizzazione stato salute sistema
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { useSystemHealthContext } from './SystemHealthProvider';
import { useUIStore } from '@/store';

// ===== SYSTEM HEALTH MONITOR COMPONENT =====
export const SystemHealthMonitor: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { 
    healthStatus, 
    isSystemHealthy, 
    status, 
    retryCount, 
    isOnline,
    errorCount,
    warningCount 
  } = useSystemHealthContext();
  
  const { addNotification } = useUIStore();
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);

  // Monitora cambiamenti critici del sistema
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotificationTime;
    
    // Previeni spam di notifiche (minimo 30 secondi tra notifiche)
    if (timeSinceLastNotification < 30000) return;

    // Notifica per errori critici
    if (errorCount > 0 && status === 'unhealthy') {
      addNotification({
        type: 'error',
        title: 'Sistema Non Disponibile',
        message: `${errorCount} errori rilevati. Controllare la connessione.`,
        duration: 8000,
      });
      setLastNotificationTime(now);
    }
    
    // Notifica per warning
    else if (warningCount > 0 && status === 'degraded') {
      addNotification({
        type: 'warning',
        title: 'Sistema Degradato',
        message: `${warningCount} avvisi attivi. Prestazioni ridotte.`,
        duration: 6000,
      });
      setLastNotificationTime(now);
    }

    // Notifica per recovery
    else if (isSystemHealthy && retryCount > 0) {
      addNotification({
        type: 'success',
        title: 'Sistema Ripristinato',
        message: 'Tutti i servizi funzionano correttamente.',
        duration: 4000,
      });
      setLastNotificationTime(now);
    }
  }, [status, errorCount, warningCount, isSystemHealthy, retryCount, addNotification, lastNotificationTime]);

  // Monitora stato offline
  useEffect(() => {
    if (!isOnline) {
      const timeoutId = setTimeout(() => {
        addNotification({
          type: 'warning',
          title: 'Modalità Offline',
          message: 'L\'applicazione funziona in modalità limitata.',
          duration: 6000,
        });
      }, 2000); // Attendi 2 secondi prima di notificare

      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, addNotification]);

  return (
    <>
      {children}
      
      {/* Indicatore di stato sistema fisso */}
      <SystemStatusIndicator 
        status={status}
        isOnline={isOnline}
        errorCount={errorCount}
        warningCount={warningCount}
        lastCheck={healthStatus.last_health_check}
      />
    </>
  );
};

// ===== SYSTEM STATUS INDICATOR =====
interface SystemStatusIndicatorProps {
  status: 'healthy' | 'degraded' | 'unhealthy';
  isOnline: boolean;
  errorCount: number;
  warningCount: number;
  lastCheck: string | null;
}

const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({
  status,
  isOnline,
  errorCount,
  warningCount,
  lastCheck
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Mostra indicatore solo se ci sono problemi
  useEffect(() => {
    setIsVisible(status !== 'healthy' || !isOnline || errorCount > 0 || warningCount > 0);
  }, [status, isOnline, errorCount, warningCount]);

  if (!isVisible) return null;

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-500';
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    switch (status) {
      case 'healthy': return 'Sistema OK';
      case 'degraded': return 'Degradato';
      case 'unhealthy': return 'Non Disponibile';
      default: return 'Sconosciuto';
    }
  };

  const formatLastCheck = () => {
    if (!lastCheck) return 'Mai';
    const date = new Date(lastCheck);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h fa`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className={`
          ${getStatusColor()} text-white px-3 py-2 rounded-lg shadow-lg cursor-pointer 
          transition-all duration-200 hover:shadow-xl
          ${isExpanded ? 'w-64' : 'w-auto'}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status principale */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-white animate-pulse`}></div>
          <span className="text-sm font-medium">{getStatusText()}</span>
          
          {/* Contatori errori/warning */}
          {(errorCount > 0 || warningCount > 0) && (
            <div className="flex gap-1">
              {errorCount > 0 && (
                <span className="bg-red-600 text-xs px-1 rounded">{errorCount}</span>
              )}
              {warningCount > 0 && (
                <span className="bg-yellow-600 text-xs px-1 rounded">{warningCount}</span>
              )}
            </div>
          )}
          
          {/* Icona espansione */}
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dettagli espansi */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-white/20 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Connessione:</span>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex justify-between">
                <span>Ultimo Check:</span>
                <span>{formatLastCheck()}</span>
              </div>
              {errorCount > 0 && (
                <div className="flex justify-between text-red-200">
                  <span>Errori:</span>
                  <span>{errorCount}</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex justify-between text-yellow-200">
                  <span>Avvisi:</span>
                  <span>{warningCount}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== HEALTH CHECK BADGE COMPONENT =====
export const HealthCheckBadge: React.FC<{ 
  showDetails?: boolean;
  className?: string; 
}> = ({ 
  showDetails = false,
  className = '' 
}) => {
  const { status, isOnline, healthStatus } = useSystemHealthContext();

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-100 text-gray-600 border-gray-300';
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-600 border-green-300';
      case 'degraded': return 'bg-yellow-100 text-yellow-600 border-yellow-300';
      case 'unhealthy': return 'bg-red-100 text-red-600 border-red-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) return '⚫';
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'unhealthy': return '🔴';
      default: return '⚫';
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded border text-xs ${getStatusColor()} ${className}`}>
      <span>{getStatusIcon()}</span>
      <span className="font-medium">
        {!isOnline ? 'Offline' : status === 'healthy' ? 'Sistema OK' : 
         status === 'degraded' ? 'Degradato' : 'Errore'}
      </span>
      
      {showDetails && healthStatus.performance_metrics && (
        <span className="text-xs opacity-75">
          {Math.round(healthStatus.performance_metrics.api_response_time || 0)}ms
        </span>
      )}
    </div>
  );
};

// ===== PERFORMANCE METRICS DISPLAY =====
export const PerformanceMetrics: React.FC = () => {
  const { healthStatus } = useSystemHealthContext();
  const metrics = healthStatus.performance_metrics;

  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg border">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">
          {Math.round(metrics.loadTime || 0)}ms
        </div>
        <div className="text-sm text-muted-foreground">Load Time</div>
      </div>
      
      {metrics.api_response_time && (
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {Math.round(metrics.api_response_time)}ms
          </div>
          <div className="text-sm text-muted-foreground">API Response</div>
        </div>
      )}
      
      {metrics.memoryUsage && (
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {Math.round(metrics.memoryUsage / 1024 / 1024)}MB
          </div>
          <div className="text-sm text-muted-foreground">Memory Usage</div>
        </div>
      )}
      
      <div className="text-center">
        <div className={`text-2xl font-bold ${metrics.memoryPressure ? 'text-destructive' : 'text-primary'}`}>
          {metrics.memoryPressure ? 'HIGH' : 'OK'}
        </div>
        <div className="text-sm text-muted-foreground">Memory Pressure</div>
      </div>
    </div>
  );
};

export default SystemHealthMonitor;
