# core/cloud_sync.py
"""
Modulo per la sincronizzazione del database con Google Drive.
Gestisce upload, download, risoluzione conflitti e sincronizzazione automatica.
"""

import os
import json
import sqlite3
import hashlib
import logging
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import time

try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
    from google.auth.exceptions import RefreshError
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    logging.warning("Google Drive sync non disponibile: installare google-api-python-client, google-auth-httplib2, google-auth-oauthlib")

from .database import get_connection, DB_PATH
from .utils import CONFIG_FILE_PATH

logger = logging.getLogger(__name__)

# Scope richiesti per Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.file']

class CloudSyncManager:
    """Gestisce la sincronizzazione del database con Google Drive"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or CONFIG_FILE_PATH
        self.credentials_file = os.path.join(os.path.dirname(self.config_path), 'google_credentials.json')
        self.token_file = os.path.join(os.path.dirname(self.config_path), 'google_token.json')
        self.service = None
        self.sync_enabled = False
        self.auto_sync_interval = 300  # 5 minuti default
        self.last_sync_time = None
        self.sync_thread = None
        self.stop_sync = threading.Event()
        
        # Nome file su Google Drive
        self.remote_db_name = "fattura_analyzer_db.sqlite"
        self.remote_file_id = None
        
        if GOOGLE_AVAILABLE:
            self._load_config()
            self._init_google_service()
    
    def _load_config(self):
        """Carica configurazione sync da config.ini"""
        try:
            import configparser
            config = configparser.ConfigParser()
            config.read(self.config_path)
            
            if 'CloudSync' in config:
                self.sync_enabled = config.getboolean('CloudSync', 'enabled', fallback=False)
                self.auto_sync_interval = config.getint('CloudSync', 'auto_sync_interval', fallback=300)
                self.remote_file_id = config.get('CloudSync', 'remote_file_id', fallback=None)
                
        except Exception as e:
            logger.error(f"Errore caricamento config sync: {e}")
    
    def _save_config(self):
        """Salva configurazione sync in config.ini"""
        try:
            import configparser
            config = configparser.ConfigParser()
            config.read(self.config_path)
            
            if 'CloudSync' not in config:
                config.add_section('CloudSync')
            
            config.set('CloudSync', 'enabled', str(self.sync_enabled))
            config.set('CloudSync', 'auto_sync_interval', str(self.auto_sync_interval))
            if self.remote_file_id:
                config.set('CloudSync', 'remote_file_id', self.remote_file_id)
            
            with open(self.config_path, 'w') as f:
                config.write(f)
                
        except Exception as e:
            logger.error(f"Errore salvataggio config sync: {e}")
    
    def _init_google_service(self):
        """Inizializza il servizio Google Drive"""
        if not GOOGLE_AVAILABLE:
            return False
            
        try:
            creds = None
            
            # Carica token esistente
            if os.path.exists(self.token_file):
                creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
            
            # Se non ci sono credenziali valide, richiedi autorizzazione
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    try:
                        creds.refresh(Request())
                    except RefreshError:
                        logger.info("Token scaduto, richiesta nuova autorizzazione")
                        creds = None
                
                if not creds:
                    if not os.path.exists(self.credentials_file):
                        logger.error("File credentials.json non trovato. Scaricare da Google Cloud Console.")
                        return False
                    
                    flow = InstalledAppFlow.from_client_secrets_file(self.credentials_file, SCOPES)
                    creds = flow.run_local_server(port=0)
                
                # Salva token per usi futuri
                with open(self.token_file, 'w') as token:
                    token.write(creds.to_json())
            
            self.service = build('drive', 'v3', credentials=creds)
            logger.info("Servizio Google Drive inizializzato con successo")
            return True
            
        except Exception as e:
            logger.error(f"Errore inizializzazione Google Drive: {e}")
            return False
    
    def _get_file_hash(self, file_path: str) -> str:
        """Calcola hash MD5 di un file"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def _find_remote_file(self) -> Optional[str]:
        """Trova il file database su Google Drive"""
        try:
            if self.remote_file_id:
                # Verifica se il file esiste ancora
                try:
                    file = self.service.files().get(fileId=self.remote_file_id).execute()
                    return self.remote_file_id
                except:
                    self.remote_file_id = None
            
            # Cerca per nome
            results = self.service.files().list(
                q=f"name='{self.remote_db_name}' and trashed=false",
                fields="files(id, name, modifiedTime)"
            ).execute()
            
            files = results.get('files', [])
            if files:
                self.remote_file_id = files[0]['id']
                self._save_config()
                return self.remote_file_id
            
            return None
            
        except Exception as e:
            logger.error(f"Errore ricerca file remoto: {e}")
            return None
    
    def _upload_database(self, force_create: bool = False) -> bool:
        """Upload del database locale su Google Drive"""
        try:
            if not os.path.exists(DB_PATH):
                logger.error("Database locale non trovato")
                return False
            
            # Crea backup temporaneo per upload sicuro
            with tempfile.NamedTemporaryFile(suffix='.sqlite', delete=False) as temp_file:
                temp_path = temp_file.name
            
            # Copia database in temp file
            import shutil
            shutil.copy2(DB_PATH, temp_path)
            
            media = MediaFileUpload(temp_path, mimetype='application/x-sqlite3')
            
            if self.remote_file_id and not force_create:
                # Aggiorna file esistente
                file = self.service.files().update(
                    fileId=self.remote_file_id,
                    media_body=media
                ).execute()
                logger.info(f"Database aggiornato su Google Drive: {file.get('id')}")
            else:
                # Crea nuovo file
                file_metadata = {
                    'name': self.remote_db_name,
                    'description': f'FatturaAnalyzer Database - Ultimo aggiornamento: {datetime.now().isoformat()}'
                }
                file = self.service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                ).execute()
                self.remote_file_id = file.get('id')
                self._save_config()
                logger.info(f"Nuovo database creato su Google Drive: {self.remote_file_id}")
            
            # Pulizia file temporaneo
            os.unlink(temp_path)
            return True
            
        except Exception as e:
            logger.error(f"Errore upload database: {e}")
            return False
    
    def _download_database(self) -> bool:
        """Download del database da Google Drive"""
        try:
            if not self.remote_file_id:
                logger.error("File remoto non trovato")
                return False
            
            # Backup del database locale se esistente
            if os.path.exists(DB_PATH):
                backup_path = f"{DB_PATH}.backup.{int(time.time())}"
                import shutil
                shutil.copy2(DB_PATH, backup_path)
                logger.info(f"Backup database locale creato: {backup_path}")
            
            # Download in file temporaneo
            with tempfile.NamedTemporaryFile(suffix='.sqlite', delete=False) as temp_file:
                temp_path = temp_file.name
            
            request = self.service.files().get_media(fileId=self.remote_file_id)
            with open(temp_path, 'wb') as f:
                downloader = MediaIoBaseDownload(f, request)
                done = False
                while done is False:
                    status, done = downloader.next_chunk()
            
            # Verifica integrità database scaricato
            try:
                conn = sqlite3.connect(temp_path)
                conn.execute("SELECT COUNT(*) FROM sqlite_master")
                conn.close()
            except Exception as e:
                logger.error(f"Database scaricato corrotto: {e}")
                os.unlink(temp_path)
                return False
            
            # Sostituisci database locale
            import shutil
            shutil.move(temp_path, DB_PATH)
            logger.info("Database scaricato e sostituito con successo")
            return True
            
        except Exception as e:
            logger.error(f"Errore download database: {e}")
            return False
    
    def _get_remote_modified_time(self) -> Optional[datetime]:
        """Ottiene il timestamp di modifica del file remoto"""
        try:
            if not self.remote_file_id:
                return None
            
            file = self.service.files().get(
                fileId=self.remote_file_id,
                fields='modifiedTime'
            ).execute()
            
            modified_time = file.get('modifiedTime')
            if modified_time:
                return datetime.fromisoformat(modified_time.replace('Z', '+00:00'))
            
            return None
            
        except Exception as e:
            logger.error(f"Errore recupero timestamp remoto: {e}")
            return None
    
    def _get_local_modified_time(self) -> Optional[datetime]:
        """Ottiene il timestamp di modifica del database locale"""
        try:
            if not os.path.exists(DB_PATH):
                return None
            
            timestamp = os.path.getmtime(DB_PATH)
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)
            
        except Exception as e:
            logger.error(f"Errore recupero timestamp locale: {e}")
            return None
    
    def sync_database(self, force_direction: str = None) -> Dict[str, Any]:
        """
        Sincronizza il database locale con Google Drive
        
        Args:
            force_direction: 'upload', 'download' o None per auto-detect
            
        Returns:
            Dict con risultato sincronizzazione
        """
        result = {
            'success': False,
            'action': None,
            'message': '',
            'timestamp': datetime.now().isoformat()
        }
        
        if not self.service:
            result['message'] = 'Servizio Google Drive non disponibile'
            return result
        
        try:
            # Trova file remoto
            remote_file_id = self._find_remote_file()
            local_exists = os.path.exists(DB_PATH)
            
            if force_direction == 'upload':
                if not local_exists:
                    result['message'] = 'Database locale non trovato per upload'
                    return result
                
                success = self._upload_database()
                result['action'] = 'upload'
                result['success'] = success
                result['message'] = 'Upload completato' if success else 'Errore durante upload'
                
            elif force_direction == 'download':
                if not remote_file_id:
                    result['message'] = 'File remoto non trovato per download'
                    return result
                
                success = self._download_database()
                result['action'] = 'download'
                result['success'] = success
                result['message'] = 'Download completato' if success else 'Errore durante download'
                
            else:
                # Auto-detect direzione
                if not remote_file_id and not local_exists:
                    result['message'] = 'Nessun database trovato (locale o remoto)'
                    return result
                
                elif not remote_file_id and local_exists:
                    # Solo locale esiste - upload
                    success = self._upload_database(force_create=True)
                    result['action'] = 'upload'
                    result['success'] = success
                    result['message'] = 'Database locale caricato su Drive'
                    
                elif remote_file_id and not local_exists:
                    # Solo remoto esiste - download
                    success = self._download_database()
                    result['action'] = 'download'
                    result['success'] = success
                    result['message'] = 'Database scaricato da Drive'
                    
                else:
                    # Entrambi esistono - confronta timestamp
                    remote_time = self._get_remote_modified_time()
                    local_time = self._get_local_modified_time()
                    
                    if not remote_time or not local_time:
                        result['message'] = 'Impossibile confrontare timestamp'
                        return result
                    
                    if local_time > remote_time:
                        # Locale più recente - upload
                        success = self._upload_database()
                        result['action'] = 'upload'
                        result['message'] = 'Database locale più recente - sincronizzato su Drive'
                    elif remote_time > local_time:
                        # Remoto più recente - download
                        success = self._download_database()
                        result['action'] = 'download'
                        result['message'] = 'Database remoto più recente - sincronizzato localmente'
                    else:
                        # Stessi timestamp
                        result['action'] = 'none'
                        result['success'] = True
                        result['message'] = 'Database già sincronizzato'
                        return result
                    
                    result['success'] = success
            
            if result['success']:
                self.last_sync_time = datetime.now()
            
            return result
            
        except Exception as e:
            logger.error(f"Errore sincronizzazione: {e}")
            result['message'] = f'Errore sincronizzazione: {str(e)}'
            return result
    
    def start_auto_sync(self):
        """Avvia sincronizzazione automatica in background"""
        if not self.sync_enabled or not self.service:
            return
        
        if self.sync_thread and self.sync_thread.is_alive():
            return
        
        self.stop_sync.clear()
        self.sync_thread = threading.Thread(target=self._auto_sync_worker, daemon=True)
        self.sync_thread.start()
        logger.info(f"Auto-sync avviato (intervallo: {self.auto_sync_interval}s)")
    
    def stop_auto_sync(self):
        """Ferma sincronizzazione automatica"""
        if self.sync_thread:
            self.stop_sync.set()
            self.sync_thread.join(timeout=5)
        logger.info("Auto-sync fermato")
    
    def _auto_sync_worker(self):
        """Worker thread per sincronizzazione automatica"""
        while not self.stop_sync.is_set():
            try:
                result = self.sync_database()
                if result['success'] and result['action'] != 'none':
                    logger.info(f"Auto-sync: {result['message']}")
                    
            except Exception as e:
                logger.error(f"Errore auto-sync: {e}")
            
            # Attendi prossimo ciclo
            self.stop_sync.wait(self.auto_sync_interval)
    
    def is_sync_enabled(self) -> bool:
        """Verifica se la sincronizzazione è abilitata e configurata"""
        return self.sync_enabled and self.service is not None
    
    def get_sync_status(self) -> Dict[str, Any]:
        """Ottiene stato corrente della sincronizzazione"""
        return {
            'enabled': self.sync_enabled,
            'service_available': self.service is not None,
            'remote_file_id': self.remote_file_id,
            'last_sync_time': self.last_sync_time.isoformat() if self.last_sync_time else None,
            'auto_sync_running': self.sync_thread is not None and self.sync_thread.is_alive()
        }

# Singleton instance
_sync_manager = None

def get_sync_manager() -> CloudSyncManager:
    """Ottiene istanza singleton del CloudSyncManager"""
    global _sync_manager
    if _sync_manager is None:
        _sync_manager = CloudSyncManager()
    return _sync_manager