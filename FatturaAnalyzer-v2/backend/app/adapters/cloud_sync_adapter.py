"""
Cloud Sync Adapter per FastAPI
Fornisce interfaccia async per il core/cloud_sync.py esistente senza modificarlo
"""

import asyncio
import logging
import os # Aggiunto import os mancante per get_sync_config_async
from typing import Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor

# Import del core esistente (INVARIATO)
# Assicurati che questo import funzioni correttamente in base alla tua struttura.
# Se core/cloud_sync.py è in app/core/cloud_sync.py:
from app.core.cloud_sync import get_sync_manager
# Altrimenti, aggiusta il percorso di importazione.

logger = logging.getLogger(__name__)

# Thread pool per operazioni sincrone del core
_thread_pool = ThreadPoolExecutor(max_workers=1)  # Single worker per sync

class CloudSyncAdapter:
    """
    Adapter che fornisce interfaccia async per il cloud sync core esistente
    """

    @staticmethod
    async def get_sync_status_async() -> Dict[str, Any]:
        """Versione async di get_sync_status"""
        def _get_status():
            sync_manager = get_sync_manager()
            return sync_manager.get_sync_status()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_status) # Corretto: passa _get_status

    @staticmethod
    async def get_sync_config_async() -> Dict[str, Any]:
        """Ottiene configurazione sync in modo async"""
        def _get_config():
            sync_manager = get_sync_manager()
            return {
                "sync_enabled": sync_manager.sync_enabled,
                "auto_sync_interval": sync_manager.auto_sync_interval,
                "remote_file_name": sync_manager.remote_db_name,
                "credentials_file_exists": os.path.exists(sync_manager.credentials_file),
                "token_file_exists": os.path.exists(sync_manager.token_file),
                "service_available": sync_manager.service is not None,
                "remote_file_id": sync_manager.remote_file_id
            }

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_config)

    @staticmethod
    async def reset_authorization_async() -> bool:
        """Reset autorizzazione in modo async"""
        def _reset_auth():
            # import os # os è già importato a livello di modulo
            sync_manager = get_sync_manager()

            # Stop auto-sync first
            sync_manager.stop_auto_sync()

            # Delete token file if it exists
            if os.path.exists(sync_manager.token_file):
                os.remove(sync_manager.token_file)
                logger.info("Token file deleted")

            # Reset service
            sync_manager.service = None
            return True

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _reset_auth)

    @staticmethod
    async def sync_database_async(force_direction: Optional[str] = None) -> Dict[str, Any]:
        """Versione async di sync_database"""
        def _sync_database():
            sync_manager = get_sync_manager()
            return sync_manager.sync_database(force_direction=force_direction)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _sync_database)

    @staticmethod
    async def enable_sync_async() -> bool:
        """Abilita la sincronizzazione in modo async"""
        def _enable_sync():
            sync_manager = get_sync_manager()
            sync_manager.sync_enabled = True
            sync_manager._save_config() # Assumendo che _save_config esista in sync_manager
            sync_manager.start_auto_sync()
            return True

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _enable_sync)

    @staticmethod
    async def disable_sync_async() -> bool:
        """Disabilita la sincronizzazione in modo async"""
        def _disable_sync():
            sync_manager = get_sync_manager()
            sync_manager.stop_auto_sync()
            sync_manager.sync_enabled = False
            sync_manager._save_config() # Assumendo che _save_config esista in sync_manager
            return True

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _disable_sync)

    @staticmethod
    async def start_auto_sync_async() -> bool:
        """Avvia auto-sync in modo async"""
        def _start_auto_sync():
            sync_manager = get_sync_manager()
            sync_manager.start_auto_sync()
            return True

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _start_auto_sync)

    @staticmethod
    async def stop_auto_sync_async() -> bool:
        """Ferma auto-sync in modo async"""
        def _stop_auto_sync():
            sync_manager = get_sync_manager()
            sync_manager.stop_auto_sync()
            return True

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _stop_auto_sync)

    @staticmethod
    async def update_auto_sync_interval_async(interval_seconds: int) -> bool:
        """Aggiorna intervallo auto-sync in modo async"""
        def _update_interval():
            sync_manager = get_sync_manager()
            sync_manager.auto_sync_interval = interval_seconds
            sync_manager._save_config() # Assumendo che _save_config esista in sync_manager

            # Restart auto-sync if running
            if sync_manager.sync_thread and sync_manager.sync_thread.is_alive(): # Assumendo che sync_thread esista
                sync_manager.stop_auto_sync()
                sync_manager.start_auto_sync()
            return True

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _update_interval)

    @staticmethod
    async def get_remote_file_info_async() -> Dict[str, Any]:
        """Ottiene info file remoto in modo async"""
        def _get_remote_info():
            sync_manager = get_sync_manager()

            if not sync_manager.service or not sync_manager.remote_file_id: # Assumendo che queste proprietà esistano
                return {"exists": False}

            try:
                file_metadata = sync_manager.service.files().get(
                    fileId=sync_manager.remote_file_id,
                    fields='id,name,size,modifiedTime,createdTime,md5Checksum'
                ).execute()

                remote_modified_time = sync_manager._get_remote_modified_time() # Assumendo che esista
                local_modified_time = sync_manager._get_local_modified_time()   # Assumendo che esista

                return {
                    "exists": True,
                    "file_id": file_metadata['id'],
                    "name": file_metadata['name'],
                    "size": int(file_metadata.get('size', 0)),
                    "size_mb": round(int(file_metadata.get('size', 0)) / (1024*1024), 2),
                    "created_time": file_metadata.get('createdTime'),
                    "modified_time": file_metadata.get('modifiedTime'),
                    "md5_checksum": file_metadata.get('md5Checksum'),
                    "local_modified_time": local_modified_time.isoformat() if local_modified_time else None,
                    "remote_modified_time": remote_modified_time.isoformat() if remote_modified_time else None,
                    "sync_needed": (local_modified_time and remote_modified_time and
                                  local_modified_time != remote_modified_time)
                }
            except Exception as e:
                logger.error(f"Error getting remote file info: {e}") # Log dell'errore
                return {"exists": False, "error": str(e)}

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_remote_info)

    @staticmethod
    async def delete_remote_file_async() -> bool:
        """Elimina file remoto in modo async"""
        def _delete_remote():
            sync_manager = get_sync_manager()

            if not sync_manager.service or not sync_manager.remote_file_id:
                return True  # Nothing to delete

            try:
                sync_manager.service.files().delete(fileId=sync_manager.remote_file_id).execute()
                sync_manager.remote_file_id = None
                sync_manager._save_config() # Assumendo che _save_config esista
                return True
            except Exception as e:
                logger.error(f"Error deleting remote file: {e}")
                return False

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _delete_remote)

    @staticmethod
    async def test_connection_async() -> Dict[str, Any]:
        """Testa connessione Google Drive in modo async"""
        def _test_connection(): # Questa funzione era mancante nella parte duplicata
            sync_manager = get_sync_manager()

            if not sync_manager.service:
                return {
                    "success": False,
                    "message": "Google Drive service not available"
                }

            try:
                # Test basic API access
                about = sync_manager.service.about().get(fields='user,storageQuota').execute()

                # Test file listing permission
                files_list = sync_manager.service.files().list(
                    pageSize=1,
                    fields='files(id,name)'
                ).execute()

                user_info = about.get('user', {})
                storage_info = about.get('storageQuota', {})

                return {
                    "success": True,
                    "message": "Google Drive connection successful",
                    "user": {
                        "email": user_info.get('emailAddress'),
                        "display_name": user_info.get('displayName')
                    },
                    "storage": {
                        "limit": storage_info.get('limit'),
                        "usage": storage_info.get('usage'),
                        "usage_in_drive": storage_info.get('usageInDrive')
                    },
                    "permissions": {
                        "can_list_files": len(files_list.get('files', [])) >= 0,
                        "can_access_about": True
                    }
                }

            except Exception as e:
                logger.error(f"Google Drive API test failed: {e}") # Log dell'errore
                return {
                    "success": False,
                    "message": f"Google Drive API test failed: {str(e)}"
                }

        loop = asyncio.get_event_loop()
        # La prima definizione di get_sync_status_async chiamava _test_connection per errore,
        # ma la funzione _test_connection è effettivamente usata dal metodo test_connection_async.
        # Quindi qui passiamo la funzione corretta:
        return await loop.run_in_executor(_thread_pool, _test_connection)

# Istanza globale dell'adapter (corretta)
sync_adapter = CloudSyncAdapter()

# Per esportare l'istanza se il file è usato come modulo
__all__ = ["sync_adapter", "CloudSyncAdapter"]