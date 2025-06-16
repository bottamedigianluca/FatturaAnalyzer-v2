/**
 * System Health Provider V4.0
 * 
 * Questo provider ha lo scopo di monitorare lo stato di salute del sistema,
 * in particolare la connettività e la reattività del backend.
 * 
 * Fornisce un contesto globale con lo stato di salute, permettendo a qualsiasi
 * componente nell'applicazione di reagire ai cambiamenti (es. mostrare un banner
 * "Offline", disabilitare funzionalità, etc.).
 */

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useUIStore } from '@/store';
import { apiClient } from '@/services/api';
import type { APIResponse } from '@/types'; // Assumendo che APIResponse sia definito nei tipi

// 1. Interfaccia per i dati di salute esposti dal backend
// Arricchita per contenere più dettagli dall'endpoint /health
export interface HealthStatus {
  backend_healthy: boolean;
  database_connected: boolean;
  last_health_check: string | null;
  api_version?: string;
  core_integration_status?: string;
  first_run_required?: boolean;
}

// 2. Interfaccia per il valore del contesto che verrà fornito ai componenti figli
export interface SystemHealthContextType {
  healthStatus: HealthStatus;
  checkSystemHealth: () => Promise<void>; // Funzione per forzare un refresh manuale
  isSystemHealthy: boolean;               // Un booleano semplice per controlli veloci
  isLoading: boolean;                     // Indica se è in corso un health check
}

// 3. Creazione del Contesto React
// Verrà usato dai componenti per "consumare" lo stato di salute.
const SystemHealthContext = createContext<SystemHealthContextType | undefined>(undefined);

// 4. Implementazione del Componente Provider
// Questo componente avvolgerà l'intera applicazione o parti di essa.
export function SystemHealthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    backend_healthy: false,
    database_connected: false,
    last_health_check: null,
  });

  // Otteniamo la funzione per aggiornare lo store globale di Zustand
  const updateSystemStatusInStore = useUIStore((state) => state.updateSystemStatus);

  // Funzione per eseguire il controllo di salute, incapsulata in useCallback per stabilità
  const checkSystemHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Chiamata all'endpoint /health del backend tramite il nostro apiClient
      const response = await apiClient.healthCheck();
      
      const isHealthy = response.status === 'healthy' && response.database === 'connected';
      
      const newStatus: HealthStatus = {
        backend_healthy: isHealthy,
        database_connected: response.database === 'connected',
        last_health_check: new Date().toISOString(),
        api_version: response.version,
        core_integration_status: response.core_integration,
        first_run_required: response.first_run_required,
      };

      setHealthStatus(newStatus);

      // Aggiorna anche lo store globale di Zustand, così altri componenti possono reagire
      updateSystemStatusInStore({
        connection_status: isHealthy ? 'connected' : 'disconnected',
        last_health_check: newStatus.last_health_check,
        backend_version: newStatus.api_version,
      });

    } catch (error) {
      console.error("Health check failed:", error);
      const failedStatus: HealthStatus = {
        backend_healthy: false,
        database_connected: false,
        last_health_check: new Date().toISOString(),
      };
      setHealthStatus(failedStatus);
      updateSystemStatusInStore({ connection_status: 'disconnected' });
    } finally {
      setIsLoading(false);
    }
  }, [updateSystemStatusInStore]);

  // useEffect per eseguire il controllo all'avvio e impostare un controllo periodico
  useEffect(() => {
    checkSystemHealth(); // Esegui subito al montaggio del provider

    const intervalId = setInterval(() => {
      checkSystemHealth();
    }, 5 * 60 * 1000); // Esegui un check ogni 5 minuti

    return () => clearInterval(intervalId); // Pulisci l'intervallo quando il componente viene smontato
  }, [checkSystemHealth]);

  // Deriviamo un semplice booleano per controlli facili
  const isSystemHealthy = healthStatus.backend_healthy && healthStatus.database_connected;

  // Costruiamo l'oggetto "value" che verrà passato a tutti i componenti consumatori
  const value: SystemHealthContextType = {
    healthStatus,
    checkSystemHealth,
    isSystemHealthy,
    isLoading,
  };

  return (
    <SystemHealthContext.Provider value={value}>
      {children}
    </SystemHealthContext.Provider>
  );
}

// 5. Hook Personalizzato per un facile accesso al contesto
// Questo è ciò che i componenti useranno per accedere ai dati di salute.
export const useSystemHealthContext = (): SystemHealthContextType => {
  const context = useContext(SystemHealthContext);
  if (context === undefined) {
    // Questo errore è utile per lo sviluppo, ci dice se stiamo usando l'hook fuori dal provider
    throw new Error('useSystemHealthContext deve essere usato all\'interno di un SystemHealthProvider');
  }
  return context;
};
