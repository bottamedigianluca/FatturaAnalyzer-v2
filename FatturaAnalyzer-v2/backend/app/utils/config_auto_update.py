# app/utils/config_auto_update.py
"""
Sistema per auto-aggiornamento e migrazione config.ini
"""

import configparser
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class ConfigManager:
    """Gestisce configurazione con auto-update e migrazione"""
    
    def __init__(self, config_path: str = "config.ini"):
        self.config_path = config_path
        self.backup_dir = Path("config_backups")
        self.backup_dir.mkdir(exist_ok=True)
        
        # Versioni schema configurazione
        self.CURRENT_VERSION = "2.0"
        self.SUPPORTED_VERSIONS = ["1.0", "1.5", "2.0"]
        
    def get_config_version(self) -> str:
        """Ottiene versione configurazione"""
        if not Path(self.config_path).exists():
            return "0.0"
        
        config = configparser.ConfigParser()
        try:
            config.read(self.config_path, encoding='utf-8')
            return config.get('System', 'ConfigVersion', fallback="1.0")
        except:
            return "1.0"
    
    def backup_config(self) -> str:
        """Crea backup configurazione corrente"""
        if not Path(self.config_path).exists():
            return ""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        version = self.get_config_version()
        backup_name = f"config_v{version}_{timestamp}.ini"
        backup_path = self.backup_dir / backup_name
        
        try:
            shutil.copy2(self.config_path, backup_path)
            logger.info(f"Config backed up to: {backup_path}")
            return str(backup_path)
        except Exception as e:
            logger.error(f"Error backing up config: {e}")
            return ""
    
    def create_default_config_v2(self, company_data: Dict[str, Any] = None) -> bool:
        """Crea configurazione v2.0 completa"""
        config = configparser.ConfigParser()
        
        # Sezione System (nuova in v2.0)
        config.add_section('System')
        config.set('System', 'ConfigVersion', '2.0')
        config.set('System', 'CreatedAt', datetime.now().isoformat())
        config.set('System', 'LastUpdated', datetime.now().isoformat())
        config.set('System', 'AutoBackup', 'true')
        
        # Sezione Paths
        config.add_section('Paths')
        config.set('Paths', 'DatabaseFile', 'database.db')
        config.set('Paths', 'LogsDirectory', 'logs')
        config.set('Paths', 'UploadsDirectory', 'uploads')
        config.set('Paths', 'TempDirectory', 'temp')
        config.set('Paths', 'BackupsDirectory', 'backups')
        
        # Sezione Azienda
        config.add_section('Azienda')
        if company_data:
            config.set('Azienda', 'RagioneSociale', company_data.get('ragione_sociale', ''))
            config.set('Azienda', 'PartitaIVA', company_data.get('partita_iva', ''))
            config.set('Azienda', 'CodiceFiscale', company_data.get('codice_fiscale', ''))
            config.set('Azienda', 'Indirizzo', company_data.get('indirizzo', ''))
            config.set('Azienda', 'CAP', company_data.get('cap', ''))
            config.set('Azienda', 'Citta', company_data.get('citta', ''))
            config.set('Azienda', 'Provincia', company_data.get('provincia', ''))
            config.set('Azienda', 'Paese', company_data.get('paese', 'IT'))
            config.set('Azienda', 'Telefono', company_data.get('telefono', ''))
            config.set('Azienda', 'Email', company_data.get('email', ''))
            config.set('Azienda', 'CodiceDestinatario', company_data.get('codice_destinatario', ''))
            config.set('Azienda', 'RegimeFiscale', company_data.get('regime_fiscale', 'RF01'))
        else:
            config.set('Azienda', 'RagioneSociale', 'La Tua Azienda SRL')
            config.set('Azienda', 'PartitaIVA', '')
            config.set('Azienda', 'CodiceFiscale', '')
            config.set('Azienda', 'Indirizzo', '')
            config.set('Azienda', 'CAP', '')
            config.set('Azienda', 'Citta', '')
            config.set('Azienda', 'Provincia', '')
            config.set('Azienda', 'Paese', 'IT')
            config.set('Azienda', 'Telefono', '')
            config.set('Azienda', 'Email', '')
            config.set('Azienda', 'CodiceDestinatario', '')
            config.set('Azienda', 'RegimeFiscale', 'RF01')
        
        # Sezione API (nuova in v2.0)
        config.add_section('API')
        config.set('API', 'Host', '127.0.0.1')
        config.set('API', 'Port', '8000')
        config.set('API', 'Debug', 'false')
        config.set('API', 'CorsOrigins', 'tauri://localhost,http://localhost:3000,http://localhost:1420')
        config.set('API', 'MaxUploadSize', '100')
        config.set('API', 'RateLimit', '60')
        config.set('API', 'EnableMetrics', 'true')
        config.set('API', 'EnableDocs', 'true')
        
        # Sezione CloudSync
        config.add_section('CloudSync')
        config.set('CloudSync', 'Enabled', 'false')
        config.set('CloudSync', 'CredentialsFile', 'google_credentials.json')
        config.set('CloudSync', 'AutoSyncInterval', '3600')
        config.set('CloudSync', 'BackupEnabled', 'true')
        config.set('CloudSync', 'SyncOnStartup', 'false')
        
        # Sezione Security (nuova in v2.0)
        config.add_section('Security')
        config.set('Security', 'EnableAPIKeys', 'false')
        config.set('Security', 'SessionTimeout', '3600')
        config.set('Security', 'MaxLoginAttempts', '5')
        config.set('Security', 'EnableAuditLog', 'false')
        
        # Sezione Performance (nuova in v2.0)
        config.add_section('Performance')
        config.set('Performance', 'DatabasePoolSize', '5')
        config.set('Performance', 'CacheEnabled', 'true')
        config.set('Performance', 'CacheTTL', '3600')
        config.set('Performance', 'WorkerProcesses', '4')
        
        # Sezione Features (nuova in v2.0)
        config.add_section('Features')
        config.set('Features', 'EnableAnalytics', 'true')
        config.set('Features', 'EnableReconciliation', 'true')
        config.set('Features', 'EnableReporting', 'true')
        config.set('Features', 'EnableWebhooks', 'false')
        
        # Sezione Localization (nuova in v2.0)
        config.add_section('Localization')
        config.set('Localization', 'Language', 'it_IT')
        config.set('Localization', 'Timezone', 'Europe/Rome')
        config.set('Localization', 'Currency', 'EUR')
        config.set('Localization', 'DateFormat', 'DD/MM/YYYY')
        config.set('Localization', 'NumberFormat', 'IT')
        
        try:
            with open(self.config_path, 'w', encoding='utf-8') as configfile:
                config.write(configfile)
            logger.info(f"Created config v2.0: {self.config_path}")
            return True
        except Exception as e:
            logger.error(f"Error creating config: {e}")
            return False
    
    def migrate_config(self, from_version: str, to_version: str = None) -> bool:
        """Migra configurazione tra versioni"""
        if to_version is None:
            to_version = self.CURRENT_VERSION
        
        logger.info(f"Migrating config from v{from_version} to v{to_version}")
        
        # Backup configurazione corrente
        backup_path = self.backup_config()
        if not backup_path:
            logger.error("Failed to backup config before migration")
            return False
        
        try:
            # Leggi configurazione corrente
            current_config = configparser.ConfigParser()
            current_config.read(self.config_path, encoding='utf-8')
            
            # Estrai dati azienda esistenti
            company_data = {}
            if current_config.has_section('Azienda'):
                company_data = {
                    'ragione_sociale': current_config.get('Azienda', 'RagioneSociale', fallback=''),
                    'partita_iva': current_config.get('Azienda', 'PartitaIVA', fallback=''),
                    'codice_fiscale': current_config.get('Azienda', 'CodiceFiscale', fallback=''),
                    'indirizzo': current_config.get('Azienda', 'Indirizzo', fallback=''),
                    'cap': current_config.get('Azienda', 'CAP', fallback=''),
                    'citta': current_config.get('Azienda', 'Citta', fallback=''),
                    'provincia': current_config.get('Azienda', 'Provincia', fallback=''),
                    'paese': current_config.get('Azienda', 'Paese', fallback='IT'),
                    'telefono': current_config.get('Azienda', 'Telefono', fallback=''),
                    'email': current_config.get('Azienda', 'Email', fallback=''),
                    'codice_destinatario': current_config.get('Azienda', 'CodiceDestinatario', fallback=''),
                    'regime_fiscale': current_config.get('Azienda', 'RegimeFiscale', fallback='RF01')
                }
            
            # Migrazione specifica per versione
            if from_version == "1.0" and to_version == "2.0":
                return self._migrate_1_0_to_2_0(current_config, company_data)
            elif from_version == "1.5" and to_version == "2.0":
                return self._migrate_1_5_to_2_0(current_config, company_data)
            else:
                logger.error(f"Migration path {from_version} -> {to_version} not supported")
                return False
                
        except Exception as e:
            logger.error(f"Error during migration: {e}")
            # Ripristina backup in caso di errore
            try:
                shutil.copy2(backup_path, self.config_path)
                logger.info("Config restored from backup due to migration error")
            except:
                logger.error("Failed to restore backup after migration error")
            return False
    
    def _migrate_1_0_to_2_0(self, old_config: configparser.ConfigParser, company_data: Dict[str, Any]) -> bool:
        """Migrazione da v1.0 a v2.0"""
        logger.info("Performing migration from v1.0 to v2.0")
        
        # Crea nuova configurazione v2.0
        success = self.create_default_config_v2(company_data)
        if not success:
            return False
        
        # Preserva configurazioni cloud sync se esistenti
        new_config = configparser.ConfigParser()
        new_config.read(self.config_path, encoding='utf-8')
        
        if old_config.has_section('CloudSync'):
            new_config.set('CloudSync', 'Enabled', 
                          old_config.get('CloudSync', 'enabled', fallback='false'))
            new_config.set('CloudSync', 'CredentialsFile', 
                          old_config.get('CloudSync', 'credentials_file', fallback='google_credentials.json'))
            new_config.set('CloudSync', 'AutoSyncInterval', 
                          old_config.get('CloudSync', 'auto_sync_interval', fallback='3600'))
        
        # Preserva path database se personalizzato
        if old_config.has_section('Paths'):
            new_config.set('Paths', 'DatabaseFile',
                          old_config.get('Paths', 'DatabaseFile', fallback='database.db'))
        
        # Salva configurazione aggiornata
        try:
            with open(self.config_path, 'w', encoding='utf-8') as configfile:
                new_config.write(configfile)
            return True
        except Exception as e:
            logger.error(f"Error saving migrated config: {e}")
            return False
    
    def _migrate_1_5_to_2_0(self, old_config: configparser.ConfigParser, company_data: Dict[str, Any]) -> bool:
        """Migrazione da v1.5 a v2.0"""
        logger.info("Performing migration from v1.5 to v2.0")
        # Implementazione simile ma con meno cambiamenti
        return self._migrate_1_0_to_2_0(old_config, company_data)
    
    def validate_config(self) -> Tuple[bool, List[str], List[str]]:
        """Valida configurazione corrente"""
        errors = []
        warnings = []
        
        if not Path(self.config_path).exists():
            errors.append("File config.ini non trovato")
            return False, errors, warnings
        
        try:
            config = configparser.ConfigParser()
            config.read(self.config_path, encoding='utf-8')
            
            # Validazioni obbligatorie
            required_sections = ['System', 'Paths', 'Azienda', 'API']
            for section in required_sections:
                if not config.has_section(section):
                    errors.append(f"Sezione obbligatoria mancante: {section}")
            
            # Validazioni specifiche
            if config.has_section('Azienda'):
                piva = config.get('Azienda', 'PartitaIVA', fallback='')
                if not piva:
                    warnings.append("Partita IVA non configurata")
                elif len(piva) != 11 or not piva.isdigit():
                    errors.append("Partita IVA non valida")
            
            # Valida versione
            version = config.get('System', 'ConfigVersion', fallback='1.0')
            if version not in self.SUPPORTED_VERSIONS:
                warnings.append(f"Versione config {version} non supportata")
            
            return len(errors) == 0, errors, warnings
            
        except Exception as e:
            errors.append(f"Errore lettura configurazione: {e}")
            return False, errors, warnings
    
    def auto_update_check(self) -> Dict[str, Any]:
        """Controlla se serve aggiornamento configurazione"""
        current_version = self.get_config_version()
        needs_update = current_version != self.CURRENT_VERSION
        
        valid, errors, warnings = self.validate_config()
        
        return {
            "current_version": current_version,
            "latest_version": self.CURRENT_VERSION,
            "needs_update": needs_update,
            "needs_migration": current_version in self.SUPPORTED_VERSIONS and needs_update,
            "config_valid": valid,
            "errors": errors,
            "warnings": warnings,
            "auto_update_available": current_version in ["1.0", "1.5"] and current_version != self.CURRENT_VERSION
        }
    
    def perform_auto_update(self) -> Dict[str, Any]:
        """Esegue aggiornamento automatico configurazione"""
        check_result = self.auto_update_check()
        
        if not check_result["needs_update"]:
            return {"success": True, "message": "Configurazione già aggiornata", "updated": False}
        
        if not check_result["needs_migration"]:
            return {"success": False, "message": "Migrazione non supportata", "updated": False}
        
        # Esegui migrazione
        current_version = check_result["current_version"]
        success = self.migrate_config(current_version, self.CURRENT_VERSION)
        
        if success:
            return {
                "success": True,
                "message": f"Configurazione aggiornata da v{current_version} a v{self.CURRENT_VERSION}",
                "updated": True,
                "backup_created": True
            }
        else:
            return {
                "success": False,
                "message": "Errore durante aggiornamento configurazione",
                "updated": False
            }


# Utility per integrazione con setup wizard
def extract_company_data_from_invoice_file(file_path: str, invoice_type: str = "active") -> Dict[str, Any]:
    """Estrae dati aziendali da file fattura"""
    try:
        # Gestione P7M e XML
        if file_path.lower().endswith('.p7m'):
            # Estrai XML da P7M (versione semplificata)
            with open(file_path, 'rb') as f:
                content = f.read()
            content_str = content.decode('utf-8', errors='ignore')
            xml_start = content_str.find('<?xml')
            xml_end = content_str.rfind('</p:FatturaElettronica>')
            
            if xml_start != -1 and xml_end != -1:
                xml_content = content_str[xml_start:xml_end + len('</p:FatturaElettronica>')]
            else:
                raise ValueError("Contenuto XML non trovato nel file P7M")
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                xml_content = f.read()
        
        # Usa extractor dal setup wizard
        from app.api.setup import CompanyDataExtractor
        return CompanyDataExtractor.extract_from_xml(xml_content, invoice_type)
        
    except Exception as e:
        logger.error(f"Error extracting company data from {file_path}: {e}")
        return {}


def update_config_with_company_data(company_data: Dict[str, Any]) -> bool:
    """Aggiorna config.ini con dati aziendali estratti"""
    try:
        config_manager = ConfigManager()
        
        # Se non esiste config, creane uno nuovo
        if not Path("config.ini").exists():
            return config_manager.create_default_config_v2(company_data)
        
        # Altrimenti aggiorna quello esistente
        config = configparser.ConfigParser()
        config.read("config.ini", encoding='utf-8')
        
        # Aggiorna sezione Azienda
        if not config.has_section('Azienda'):
            config.add_section('Azienda')
        
        for key, value in company_data.items():
            if key == 'ragione_sociale':
                config.set('Azienda', 'RagioneSociale', value or '')
            elif key == 'partita_iva':
                config.set('Azienda', 'PartitaIVA', value or '')
            elif key == 'codice_fiscale':
                config.set('Azienda', 'CodiceFiscale', value or '')
            elif key == 'indirizzo':
                config.set('Azienda', 'Indirizzo', value or '')
            elif key == 'cap':
                config.set('Azienda', 'CAP', value or '')
            elif key == 'citta':
                config.set('Azienda', 'Citta', value or '')
            elif key == 'provincia':
                config.set('Azienda', 'Provincia', value or '')
            elif key == 'paese':
                config.set('Azienda', 'Paese', value or 'IT')
            elif key == 'telefono':
                config.set('Azienda', 'Telefono', value or '')
            elif key == 'email':
                config.set('Azienda', 'Email', value or '')
            elif key == 'codice_destinatario':
                config.set('Azienda', 'CodiceDestinatario', value or '')
            elif key == 'regime_fiscale':
                config.set('Azienda', 'RegimeFiscale', value or 'RF01')
        
        # Aggiorna timestamp
        if config.has_section('System'):
            config.set('System', 'LastUpdated', datetime.now().isoformat())
        
        with open("config.ini", 'w', encoding='utf-8') as configfile:
            config.write(configfile)
        
        logger.info("Config.ini updated with company data")
        return True
        
    except Exception as e:
        logger.error(f"Error updating config with company data: {e}")
        return False


# Script standalone per auto-configurazione
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Config.ini auto-update utility")
    parser.add_argument("--check", action="store_true", help="Check if update is needed")
    parser.add_argument("--update", action="store_true", help="Perform auto-update")
    parser.add_argument("--extract-from-invoice", help="Extract company data from invoice file")
    parser.add_argument("--invoice-type", choices=["active", "passive"], default="active", 
                       help="Type of invoice for data extraction")
    
    args = parser.parse_args()
    
    config_manager = ConfigManager()
    
    if args.check:
        result = config_manager.auto_update_check()
        print(f"Current version: {result['current_version']}")
        print(f"Latest version: {result['latest_version']}")
        print(f"Needs update: {result['needs_update']}")
        print(f"Config valid: {result['config_valid']}")
        if result['errors']:
            print(f"Errors: {result['errors']}")
        if result['warnings']:
            print(f"Warnings: {result['warnings']}")
    
    elif args.update:
        result = config_manager.perform_auto_update()
        print(f"Update result: {result}")
    
    elif args.extract_from_invoice:
        company_data = extract_company_data_from_invoice_file(args.extract_from_invoice, args.invoice_type)
        if company_data:
            print("Extracted company data:")
            for key, value in company_data.items():
                print(f"  {key}: {value}")
            
            # Aggiorna config
            if update_config_with_company_data(company_data):
                print("Config.ini updated successfully!")
            else:
                print("Failed to update config.ini")
        else:
            print("Failed to extract company data")
    
    else:
        parser.print_help()
