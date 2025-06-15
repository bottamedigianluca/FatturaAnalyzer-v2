// hooks/useSync.ts - Complete Cloud Synchronization Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useUIStore } from '@/store';

// Types
export interface SyncStatus {
  enabled: boolean;
  service_available: boolean;
  remote_file_id?: string;
  last_sync_time?: string;
  auto_sync_running: boolean;
}

export interface SyncResult {
  success: boolean;
  action?: string;
  message: string;
  timestamp?: string;
}

export interface SyncHistory {
  id: number;
  timestamp: string;
  action: 'upload' | 'download' | 'auto';
  success: boolean;
  message: string;
  file_size: string;
  duration_ms: number;
}

// ===== CORE SYNC HOOKS =====

/**
 * 🔥 SYNC STATUS - Get current cloud sync status
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const response = await apiClient.getSyncStatus();
      
      if (response.success) {
        return response.data as SyncStatus;
      }
      throw new Error('Failed to get sync status');
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Enable cloud synchronization
 */
export function useEnableSync() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.enableSync();
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to enable sync');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-config'] });
      
      addNotification({
        type: 'success',
        title: 'Sincronizzazione Abilitata',
        message: 'La sincronizzazione cloud è ora attiva',
        duration: 4000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Abilitazione Sync',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Disable cloud synchronization
 */
export function useDisableSync() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.disableSync();
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to disable sync');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-config'] });
      
      addNotification({
        type: 'info',
        title: 'Sincronizzazione Disabilitata',
        message: 'La sincronizzazione cloud è stata disattivata',
        duration: 4000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Disabilitazione Sync',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * 🔥 MANUAL SYNC - Perform manual synchronization
 */
export function useManualSync() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation<SyncResult, Error, {
    force_direction?: 'upload' | 'download';
  }>({
    mutationFn: async ({ force_direction }) => {
      const response = await apiClient.performManualSync(force_direction);
      
      if (response.success) {
        return response.data as SyncResult;
      }
      throw new Error(response.message || 'Manual sync failed');
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      
      addNotification({
        type: 'success',
        title: 'Sincronizzazione Completata',
        message: result.message || 'Sincronizzazione manuale completata',
        duration: 5000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Sincronizzazione',
        message: error.message,
        duration: 6000,
      });
    },
  });
}

/**
 * Force upload to cloud
 */
export function useForceUpload() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.forceUpload();
      
      if (response.success) {
        return response.data as SyncResult;
      }
      throw new Error(response.message || 'Upload failed');
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      
      addNotification({
        type: 'success',
        title: 'Upload Completato',
        message: 'Database caricato su Google Drive con successo',
        duration: 5000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Upload',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Force download from cloud
 */
export function useForceDownload() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.forceDownload();
      
      if (response.success) {
        return response.data as SyncResult;
      }
      throw new Error(response.message || 'Download failed');
    },
    onSuccess: (result) => {
      // Invalidate all data queries since we might have new data
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['anagraphics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      
      addNotification({
        type: 'success',
        title: 'Download Completato',
        message: 'Database scaricato da Google Drive con successo',
        duration: 5000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Download',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

// ===== AUTO-SYNC HOOKS =====

/**
 * Start automatic synchronization
 */
export function useStartAutoSync() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.startAutoSync();
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to start auto-sync');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      
      addNotification({
        type: 'success',
        title: 'Auto-Sync Avviato',
        message: 'La sincronizzazione automatica è ora attiva',
        duration: 4000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Auto-Sync',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Stop automatic synchronization
 */
export function useStopAutoSync() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.stopAutoSync();
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to stop auto-sync');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      
      addNotification({
        type: 'info',
        title: 'Auto-Sync Fermato',
        message: 'La sincronizzazione automatica è stata disattivata',
        duration: 4000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Stop Auto-Sync',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Update auto-sync interval
 */
export function useUpdateAutoSyncInterval() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation<any, Error, number>({
    mutationFn: async (intervalSeconds: number) => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/auto-sync/interval?interval_seconds=${intervalSeconds}`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update auto-sync interval');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to update interval');
      }
      
      return result.data;
    },
    onSuccess: (data, intervalSeconds) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-config'] });
      
      addNotification({
        type: 'success',
        title: 'Intervallo Aggiornato',
        message: `Auto-sync ora ogni ${intervalSeconds / 60} minuti`,
        duration: 4000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Aggiornamento Intervallo',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

// ===== REMOTE FILE MANAGEMENT =====

/**
 * Get remote file information
 */
export function useRemoteFileInfo() {
  return useQuery({
    queryKey: ['remote-file-info'],
    queryFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/remote-info`);
      
      if (!response.ok) {
        throw new Error('Failed to get remote file info');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get remote file info');
      }
      
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Delete remote file from Google Drive
 */
export function useDeleteRemoteFile() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/remote-file`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete remote file');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete remote file');
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remote-file-info'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      
      addNotification({
        type: 'success',
        title: 'File Remoto Eliminato',
        message: 'Il file database su Google Drive è stato eliminato',
        duration: 4000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Eliminazione File Remoto',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

// ===== CONNECTION & TESTING =====

/**
 * 🔥 TEST GOOGLE DRIVE CONNECTION - Verify credentials and permissions
 */
export function useTestGoogleDriveConnection() {
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.testConnection();
      
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Connection test failed');
    },
    onSuccess: (result) => {
      addNotification({
        type: 'success',
        title: 'Connessione Google Drive OK',
        message: `Test riuscito - ${result.drive_quota_used || 'N/A'} spazio utilizzato`,
        duration: 5000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Test Connessione Fallito',
        message: error.message,
        duration: 6000,
      });
    },
  });
}

/**
 * Get sync configuration
 */
export function useSyncConfig() {
  return useQuery({
    queryKey: ['sync-config'],
    queryFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/config`);
      
      if (!response.ok) {
        throw new Error('Failed to get sync config');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get sync config');
      }
      
      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Reset Google Drive authorization
 */
export function useResetAuthorization() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/reset-authorization`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset authorization');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to reset authorization');
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-config'] });
      
      addNotification({
        type: 'info',
        title: 'Autorizzazione Resettata',
        message: 'Dovrai riautorizzare l\'applicazione per usare il sync',
        duration: 6000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Reset Autorizzazione',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

// ===== SYNC HISTORY =====

/**
 * Get synchronization history
 */
export function useSyncHistory() {
  return useQuery({
    queryKey: ['sync-history'],
    queryFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/history`);
      
      if (!response.ok) {
        throw new Error('Failed to get sync history');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get sync history');
      }
      
      return result.data as SyncHistory[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Clear synchronization history
 */
export function useClearSyncHistory() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/history`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear sync history');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to clear sync history');
      }
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      
      addNotification({
        type: 'success',
        title: 'Cronologia Cancellata',
        message: 'La cronologia delle sincronizzazioni è stata eliminata',
        duration: 4000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Cancellazione Cronologia',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

// ===== BACKUP & RESTORE =====

/**
 * Create backup before sync
 */
export function useCreateBackup() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/backup`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to create backup');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to create backup');
      }
      
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      
      addNotification({
        type: 'success',
        title: 'Backup Creato',
        message: `Backup salvato: ${data.backup_file}`,
        duration: 5000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Backup',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Get available backups
 */
export function useBackupsList() {
  return useQuery({
    queryKey: ['sync-backups'],
    queryFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/backups`);
      
      if (!response.ok) {
        throw new Error('Failed to get backups list');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get backups list');
      }
      
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Restore from backup
 */
export function useRestoreBackup() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation<any, Error, string>({
    mutationFn: async (backupFile: string) => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backup_file: backupFile }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore backup');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to restore backup');
      }
      
      return result.data;
    },
    onSuccess: (data, backupFile) => {
      // Invalidate all data queries since we restored from backup
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['anagraphics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      
      addNotification({
        type: 'success',
        title: 'Backup Ripristinato',
        message: `Database ripristinato da: ${backupFile}`,
        duration: 6000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Ripristino',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

/**
 * Delete backup file
 */
export function useDeleteBackup() {
  const queryClient = useQueryClient();
  const { addNotification } = useUIStore();

  return useMutation<any, Error, string>({
    mutationFn: async (backupFile: string) => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/backup/${encodeURIComponent(backupFile)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete backup');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete backup');
      }
      
      return result.data;
    },
    onSuccess: (data, backupFile) => {
      queryClient.invalidateQueries({ queryKey: ['sync-backups'] });
      
      addNotification({
        type: 'success',
        title: 'Backup Eliminato',
        message: `Backup eliminato: ${backupFile}`,
        duration: 4000,
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Errore Eliminazione Backup',
        message: error.message,
        duration: 5000,
      });
    },
  });
}

// ===== UTILITY HOOKS =====

/**
 * Get sync statistics
 */
export function useSyncStats() {
  return useQuery({
    queryKey: ['sync-stats'],
    queryFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to get sync stats');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to get sync stats');
      }
      
      return result.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Check if sync is required
 */
export function useSyncRequired() {
  return useQuery({
    queryKey: ['sync-required'],
    queryFn: async () => {
      const response = await fetch(`${apiClient.baseURL}/api/sync/check-required`);
      
      if (!response.ok) {
        throw new Error('Failed to check if sync is required');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to check sync requirement');
      }
      
      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 2 * 60 * 1000, // Check every 2 minutes
  });
}
