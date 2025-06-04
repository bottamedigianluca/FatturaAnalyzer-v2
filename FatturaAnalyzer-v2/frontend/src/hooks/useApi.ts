import { useState, useCallback } from 'react';
import { useUIStore } from '@/store';
import type { UseApiResult, UseMutationResult } from '@/types';

/**
 * Custom hook per gestire chiamate API con loading, error e success states
 */
export function useApi<T>(
  apiFunction: () => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    loadingKey?: string;
  }
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setLoading: setGlobalLoading, setError: setGlobalError, addNotification } = useUIStore();

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (options?.loadingKey) {
        setGlobalLoading(options.loadingKey, true);
      }

      const result = await apiFunction();
      setData(result);
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      
      if (options?.loadingKey) {
        setGlobalError(options.loadingKey, errorMessage);
      }

      if (options?.onError && err instanceof Error) {
        options.onError(err);
      } else {
        addNotification({
          type: 'error',
          title: 'Errore API',
          message: errorMessage,
          duration: 5000,
        });
      }

      throw err;
    } finally {
      setLoading(false);
      
      if (options?.loadingKey) {
        setGlobalLoading(options.loadingKey, false);
      }
    }
  }, [apiFunction, options, setGlobalLoading, setGlobalError, addNotification]);

  return {
    data,
    loading,
    error,
    refetch: execute,
  };
}

/**
 * Custom hook per mutazioni (POST, PUT, DELETE)
 */
export function useMutation<T, V = any>(
  mutationFunction: (variables: V) => Promise<T>,
  options?: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V) => void;
    successMessage?: string;
    errorMessage?: string;
    loadingKey?: string;
  }
): UseMutationResult<T, V> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setLoading: setGlobalLoading, addNotification } = useUIStore();

  const mutate = useCallback(async (variables: V): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      
      if (options?.loadingKey) {
        setGlobalLoading(options.loadingKey, true);
      }

      const result = await mutationFunction(variables);
      
      if (options?.onSuccess) {
        options.onSuccess(result, variables);
      }

      if (options?.successMessage) {
        addNotification({
          type: 'success',
          title: 'Operazione completata',
          message: options.successMessage,
          duration: 3000,
        });
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      
      if (options?.onError && err instanceof Error) {
        options.onError(err, variables);
      }

      addNotification({
        type: 'error',
        title: 'Errore operazione',
        message: options?.errorMessage || errorMessage,
        duration: 5000,
      });

      throw err;
    } finally {
      setLoading(false);
      
      if (options?.loadingKey) {
        setGlobalLoading(options.loadingKey, false);
      }
    }
  }, [mutationFunction, options, setGlobalLoading, addNotification]);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    mutate,
    loading,
    error,
    reset,
  };
}

/**
 * Hook per operazioni batch con progress tracking
 */
export function useBatchOperation<T, V = any>(
  batchFunction: (items: V[]) => Promise<T>,
  options?: {
    onProgress?: (completed: number, total: number) => void;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    chunkSize?: number;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  
  const { addNotification } = useUIStore();

  const execute = useCallback(async (items: V[]): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      setProgress({ completed: 0, total: items.length });

      // Se specificato chunk size, processa a blocchi
      if (options?.chunkSize && items.length > options.chunkSize) {
        const chunks = [];
        for (let i = 0; i < items.length; i += options.chunkSize) {
          chunks.push(items.slice(i, i + options.chunkSize));
        }

        const results = [];
        for (let i = 0; i < chunks.length; i++) {
          const chunkResult = await batchFunction(chunks[i]);
          results.push(chunkResult);
          
          const completed = (i + 1) * options.chunkSize;
          setProgress({ completed: Math.min(completed, items.length), total: items.length });
          
          if (options?.onProgress) {
            options.onProgress(Math.min(completed, items.length), items.length);
          }
        }
        
        // Combina risultati (assumendo che sia un array)
        const finalResult = results.flat() as T;
        
        if (options?.onSuccess) {
          options.onSuccess(finalResult);
        }

        return finalResult;
      } else {
        // Operazione singola
        const result = await batchFunction(items);
        setProgress({ completed: items.length, total: items.length });
        
        if (options?.onProgress) {
          options.onProgress(items.length, items.length);
        }

        if (options?.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore operazione batch';
      setError(errorMessage);
      
      if (options?.onError && err instanceof Error) {
        options.onError(err);
      }

      addNotification({
        type: 'error',
        title: 'Errore operazione batch',
        message: errorMessage,
        duration: 5000,
      });

      throw err;
    } finally {
      setLoading(false);
    }
  }, [batchFunction, options, addNotification]);

  const reset = useCallback(() => {
    setError(null);
    setProgress({ completed: 0, total: 0 });
  }, []);

  return {
    execute,
    loading,
    error,
    progress,
    reset,
  };
}