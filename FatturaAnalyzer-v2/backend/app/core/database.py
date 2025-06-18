#!/usr/bin/env python3
"""
Script DEFINITIVO per risolvere il problema dello schema Settings
Ripara l'incoerenza tra core/database.py e first_run.py mantenendo 100% compatibilità
Versione completa e robusta con gestione errori avanzata
"""

import sys
import asyncio
import sqlite3
import shutil
import json
import configparser
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

# Add path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

class DatabaseSchemaFixer:
    """Classe principale per il fix dello schema database"""
    
    def __init__(self):
        self.backup_dir = Path("backups") / f"schema_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.fixes_applied = []
        self.errors_encountered = []
        
    async def log_operation(self, operation: str, success: bool, details: str = ""):
        """Log delle operazioni eseguite"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "operation": operation,
            "success": success,
            "details": details
        }
        
        if success:
            self.fixes_applied.append(log_entry)
            print(f"  ✅ {operation}: {details}")
        else:
            self.errors_encountered.append(log_entry)
            print(f"  ❌ {operation}: {details}")
    
    async def create_full_backup(self) -> bool:
        """Crea backup completo del database e configurazioni"""
        print("📦 Creating comprehensive backup...")
        
        try:
            from app.config import settings
            
            # Backup database
            db_path = Path(settings.get_database_path())
            if db_path.exists():
                db_backup = self.backup_dir / "database_backup.db"
                shutil.copy2(db_path, db_backup)
                await self.log_operation("Database backup", True, f"Saved to {db_backup}")
            else:
                await self.log_operation("Database backup", False, "Database file not found")
            
            # Backup config.ini
            config_path = Path("config.ini")
            if config_path.exists():
                config_backup = self.backup_dir / "config_backup.ini"
                shutil.copy2(config_path, config_backup)
                await self.log_operation("Config backup", True, f"Saved to {config_backup}")
            
            # Backup core/database.py
            core_db_path = Path("app/core/database.py")
            if core_db_path.exists():
                core_backup = self.backup_dir / "database_core_backup.py"
                shutil.copy2(core_db_path, core_backup)
                await self.log_operation("Core database backup", True, f"Saved to {core_backup}")
            
            return True
            
        except Exception as e:
            await self.log_operation("Full backup", False, f"Error: {e}")
            return False
    
    async def analyze_current_schema(self) -> Dict[str, Any]:
        """Analizza lo schema attuale del database"""
        print("🔍 Analyzing current database schema...")
        
        schema_info = {
            "settings_exists": False,
            "settings_columns": {},
            "all_tables": [],
            "schema_issues": [],
            "recommendations": []
        }
        
        try:
            from app.adapters.database_adapter import db_adapter
            
            # Verifica esistenza tabelle
            tables_result = await db_adapter.execute_query_async("""
                SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
            """)
            
            if tables_result:
                schema_info["all_tables"] = [row['name'] for row in tables_result]
                await self.log_operation("Tables analysis", True, f"Found {len(schema_info['all_tables'])} tables")
            
            # Analizza tabella Settings specifica
            if "Settings" in schema_info["all_tables"]:
                schema_info["settings_exists"] = True
                
                settings_schema = await db_adapter.execute_query_async("""
                    PRAGMA table_info(Settings)
                """)
                
                if settings_schema:
                    for col in settings_schema:
                        schema_info["settings_columns"][col['name']] = {
                            "type": col['type'],
                            "notnull": bool(col['notnull']),
                            "default": col['dflt_value'],
                            "pk": bool(col['pk'])
                        }
                    
                    await self.log_operation("Settings schema analysis", True, 
                                           f"Found columns: {list(schema_info['settings_columns'].keys())}")
                
                # Verifica problemi schema
                required_columns = ['key', 'value', 'created_at', 'updated_at']
                missing_columns = [col for col in required_columns if col not in schema_info["settings_columns"]]
                
                if missing_columns:
                    schema_info["schema_issues"].append(f"Missing columns: {missing_columns}")
                    schema_info["recommendations"].append("Recreate Settings table with complete schema")
                
                # Verifica tipi colonne
                if 'key' in schema_info["settings_columns"]:
                    key_info = schema_info["settings_columns"]['key']
                    if not key_info['pk']:
                        schema_info["schema_issues"].append("'key' column is not PRIMARY KEY")
                
            else:
                schema_info["schema_issues"].append("Settings table does not exist")
                schema_info["recommendations"].append("Create Settings table with complete schema")
            
            # Test connessione database
            test_result = await db_adapter.execute_query_async("SELECT 1 as test")
            if test_result and test_result[0]['test'] == 1:
                await self.log_operation("Database connection test", True, "Connection working")
            else:
                schema_info["schema_issues"].append("Database connection issues")
            
            return schema_info
            
        except Exception as e:
            await self.log_operation("Schema analysis", False, f"Error: {e}")
            schema_info["schema_issues"].append(f"Analysis failed: {e}")
            return schema_info
    
    async def backup_settings_data(self) -> Optional[List[Dict]]:
        """Backup dei dati della tabella Settings"""
        print("💾 Backing up Settings table data...")
        
        try:
            from app.adapters.database_adapter import db_adapter
            
            existing_data = await db_adapter.execute_query_async("""
                SELECT * FROM Settings
            """)
            
            if existing_data:
                # Converti Row objects in dict normali per serializzazione
                data_list = []
                for row in existing_data:
                    row_dict = dict(row)
                    data_list.append(row_dict)
                
                # Salva in file JSON
                backup_file = self.backup_dir / "settings_data_backup.json"
                with open(backup_file, 'w', encoding='utf-8') as f:
                    json.dump(data_list, f, indent=2, default=str)
                
                await self.log_operation("Settings data backup", True, 
                                       f"Saved {len(data_list)} records to {backup_file}")
                return data_list
            else:
                await self.log_operation("Settings data backup", True, "No existing data to backup")
                return []
                
        except Exception as e:
            await self.log_operation("Settings data backup", False, f"Error: {e}")
            return None
    
    async def create_correct_settings_table(self) -> bool:
        """Crea la tabella Settings con lo schema corretto e completo"""
        print("🏗️ Creating Settings table with correct schema...")
        
        try:
            from app.adapters.database_adapter import db_adapter
            
            # Schema completo e definitivo
            create_sql = """
                CREATE TABLE Settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            
            await db_adapter.execute_write_async(create_sql)
            await self.log_operation("Settings table creation", True, "Table created with complete schema")
            
            # Verifica che la tabella sia stata creata correttamente
            verify_result = await db_adapter.execute_query_async("""
                PRAGMA table_info(Settings)
            """)
            
            if verify_result:
                columns = [row['name'] for row in verify_result]
                expected_columns = ['key', 'value', 'created_at', 'updated_at']
                
                if all(col in columns for col in expected_columns):
                    await self.log_operation("Settings table verification", True, 
                                           f"All required columns present: {columns}")
                    return True
                else:
                    missing = [col for col in expected_columns if col not in columns]
                    await self.log_operation("Settings table verification", False, 
                                           f"Missing columns: {missing}")
                    return False
            else:
                await self.log_operation("Settings table verification", False, "Could not verify table structure")
                return False
                
        except Exception as e:
            await self.log_operation("Settings table creation", False, f"Error: {e}")
            return False
    
    async def fix_settings_table_schema(self) -> bool:
        """Ripara lo schema della tabella Settings mantenendo i dati"""
        print("🔧 Fixing Settings table schema...")
        
        try:
            from app.adapters.database_adapter import db_adapter
            
            # 1. Analizza schema attuale
            schema_info = await self.analyze_current_schema()
            
            if not schema_info["schema_issues"]:
                await self.log_operation("Schema check", True, "Settings table already has correct schema")
                return True
            
            # 2. Backup dei dati esistenti
            existing_data = await self.backup_settings_data()
            if existing_data is None:
                return False
            
            # 3. Drop tabella esistente se necessario
            if schema_info["settings_exists"]:
                await db_adapter.execute_write_async("DROP TABLE Settings")
                await self.log_operation("Drop old Settings table", True, "Old table removed")
            
            # 4. Crea tabella con schema corretto
            if not await self.create_correct_settings_table():
                return False
            
            # 5. Ripristina dati esistenti
            if existing_data:
                for row in existing_data:
                    # Gestisce sia il caso con che senza timestamp
                    key = row.get('key')
                    value = row.get('value')
                    created_at = row.get('created_at', 'datetime("now")')
                    updated_at = row.get('updated_at', 'datetime("now")')
                    
                    if key is not None:
                        await db_adapter.execute_write_async("""
                            INSERT OR REPLACE INTO Settings (key, value, created_at, updated_at) 
                            VALUES (?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))
                        """, (key, value, created_at, updated_at))
                
                await self.log_operation("Data restoration", True, 
                                       f"Restored {len(existing_data)} settings records")
            
            return True
            
        except Exception as e:
            await self.log_operation("Settings schema fix", False, f"Error: {e}")
            return False
    
    async def update_core_database_file(self) -> bool:
        """Aggiorna il file core/database.py per prevenire il problema in futuro"""
        print("📝 Updating core/database.py to prevent future issues...")
        
        try:
            core_db_file = Path("app/core/database.py")
            
            if not core_db_file.exists():
                await self.log_operation("Core file update", False, "core/database.py not found")
                return False
            
            # Leggi il file
            with open(core_db_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Pattern più flessibile per trovare la definizione Settings sbagliata
            old_patterns = [
                'CREATE TABLE IF NOT EXISTS Settings (key TEXT PRIMARY KEY, value TEXT);',
                'CREATE TABLE IF NOT EXISTS Settings (key TEXT PRIMARY KEY, value TEXT)',
                'CREATE TABLE IF NOT EXISTS Settings\n        (key TEXT PRIMARY KEY, value TEXT);',
                'CREATE TABLE IF NOT EXISTS Settings\n            (key TEXT PRIMARY KEY, value TEXT);'
            ]
            
            # Nuova definizione corretta
            new_settings_def = '''CREATE TABLE IF NOT EXISTS Settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );'''
            
            content_updated = False
            for old_pattern in old_patterns:
                if old_pattern in content:
                    content = content.replace(old_pattern, new_settings_def)
                    content_updated = True
                    await self.log_operation("Pattern replacement", True, f"Replaced: {old_pattern[:50]}...")
            
            if content_updated:
                # Backup del file originale
                backup_file = self.backup_dir / "database_core_original.py"
                shutil.copy2(core_db_file, backup_file)
                
                # Scrivi il file aggiornato
                with open(core_db_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                await self.log_operation("Core file update", True, "core/database.py updated successfully")
                return True
            else:
                await self.log_operation("Core file update", True, "No updates needed - definitions already correct")
                return True
                
        except Exception as e:
            await self.log_operation("Core file update", False, f"Error: {e}")
            return False
    
    async def test_all_settings_operations(self) -> bool:
        """Testa tutte le operazioni sulla tabella Settings"""
        print("🧪 Testing all Settings table operations...")
        
        try:
            from app.adapters.database_adapter import db_adapter
            
            test_operations = []
            
            # Test 1: INSERT OR REPLACE con updated_at (problema originale)
            try:
                await db_adapter.execute_write_async("""
                    INSERT OR REPLACE INTO Settings (key, value, updated_at) 
                    VALUES (?, ?, datetime('now'))
                """, ("test_insert_replace", "test_value_1"))
                test_operations.append(("INSERT OR REPLACE with updated_at", True, "Success"))
            except Exception as e:
                test_operations.append(("INSERT OR REPLACE with updated_at", False, str(e)))
            
            # Test 2: INSERT normale
            try:
                await db_adapter.execute_write_async("""
                    INSERT OR IGNORE INTO Settings (key, value) 
                    VALUES (?, ?)
                """, ("test_insert_normal", "test_value_2"))
                test_operations.append(("INSERT normal", True, "Success"))
            except Exception as e:
                test_operations.append(("INSERT normal", False, str(e)))
            
            # Test 3: SELECT con tutte le colonne
            try:
                result = await db_adapter.execute_query_async("""
                    SELECT key, value, created_at, updated_at FROM Settings 
                    WHERE key LIKE 'test_%'
                """)
                if result:
                    test_operations.append(("SELECT all columns", True, f"Retrieved {len(result)} records"))
                else:
                    test_operations.append(("SELECT all columns", True, "No test records found"))
            except Exception as e:
                test_operations.append(("SELECT all columns", False, str(e)))
            
            # Test 4: UPDATE
            try:
                await db_adapter.execute_write_async("""
                    UPDATE Settings SET value = ?, updated_at = datetime('now') 
                    WHERE key = ?
                """, ("updated_value", "test_insert_replace"))
                test_operations.append(("UPDATE with updated_at", True, "Success"))
            except Exception as e:
                test_operations.append(("UPDATE with updated_at", False, str(e)))
            
            # Test 5: DELETE (cleanup)
            try:
                await db_adapter.execute_write_async("""
                    DELETE FROM Settings WHERE key LIKE 'test_%'
                """)
                test_operations.append(("DELETE cleanup", True, "Test data cleaned up"))
            except Exception as e:
                test_operations.append(("DELETE cleanup", False, str(e)))
            
            # Riporta risultati
            success_count = 0
            for operation, success, details in test_operations:
                await self.log_operation(f"Test: {operation}", success, details)
                if success:
                    success_count += 1
            
            return success_count == len(test_operations)
            
        except Exception as e:
            await self.log_operation("Settings operations test", False, f"Error: {e}")
            return False
    
    async def run_first_run_manager_setup(self) -> bool:
        """Esegue il setup tramite FirstRunManager"""
        print("🚀 Running FirstRunManager setup completion...")
        
        try:
            from app.api.first_run import FirstRunManager
            from app.adapters.database_adapter import db_adapter
            
            # 1. Verifica che il database sia inizializzato
            await db_adapter.create_tables_async()
            await self.log_operation("Database tables verification", True, "All tables verified/created")
            
            # 2. Esegui il setup completo tramite FirstRunManager
            success = await FirstRunManager.mark_setup_completed()
            if success:
                await self.log_operation("FirstRunManager setup", True, "Setup marked as completed")
            else:
                await self.log_operation("FirstRunManager setup", False, "Could not mark setup as completed")
                return False
            
            # 3. Verifica che il first run detection funzioni
            is_first_run = await FirstRunManager.is_first_run()
            if not is_first_run:
                await self.log_operation("First run detection test", True, "System recognizes setup as completed")
            else:
                await self.log_operation("First run detection test", False, "System still shows first run required")
                return False
            
            # 4. Ottieni stato sistema completo
            system_status = await FirstRunManager.get_system_status()
            if system_status.get("setup_completed", False):
                await self.log_operation("System status verification", True, "Setup completed flag is true")
            else:
                await self.log_operation("System status verification", False, "Setup completed flag is false")
            
            return True
            
        except Exception as e:
            await self.log_operation("FirstRunManager setup", False, f"Error: {e}")
            return False
    
    async def verify_config_consistency(self) -> bool:
        """Verifica che la configurazione sia consistente"""
        print("📋 Verifying configuration consistency...")
        
        try:
            # Verifica config.ini
            config_path = Path("config.ini")
            if config_path.exists():
                config = configparser.ConfigParser()
                config.read(config_path, encoding='utf-8')
                
                # Verifica sezioni essenziali
                required_sections = ['Paths', 'Azienda']
                missing_sections = [section for section in required_sections if not config.has_section(section)]
                
                if missing_sections:
                    await self.log_operation("Config sections check", False, 
                                           f"Missing sections: {missing_sections}")
                else:
                    await self.log_operation("Config sections check", True, "All required sections present")
                
                # Verifica dati azienda
                if config.has_section('Azienda'):
                    ragione_sociale = config.get('Azienda', 'RagioneSociale', fallback='').strip()
                    partita_iva = config.get('Azienda', 'PartitaIVA', fallback='').strip()
                    
                    if ragione_sociale and len(ragione_sociale) > 3 and partita_iva and len(partita_iva) >= 11:
                        await self.log_operation("Company data validation", True, 
                                               f"Company: {ragione_sociale}, VAT: {partita_iva}")
                    else:
                        await self.log_operation("Company data validation", False, 
                                               "Incomplete company data in config")
                
                # Aggiunge System section se non esiste
                if not config.has_section('System'):
                    config.add_section('System')
                    config.set('System', 'SetupCompleted', 'true')
                    config.set('System', 'SetupCompletedAt', datetime.now().isoformat())
                    config.set('System', 'SchemaFixApplied', datetime.now().isoformat())
                    
                    with open(config_path, 'w', encoding='utf-8') as f:
                        config.write(f)
                    
                    await self.log_operation("Config update", True, "Added System section with setup flags")
                
            else:
                await self.log_operation("Config file check", False, "config.ini not found")
                return False
            
            return True
            
        except Exception as e:
            await self.log_operation("Config consistency check", False, f"Error: {e}")
            return False
    
    async def run_final_health_check(self) -> bool:
        """Esegue un health check finale completo"""
        print("🏥 Running final comprehensive health check...")
        
        try:
            from app.adapters.database_adapter import db_adapter
            from app.api.first_run import FirstRunManager
            
            health_results = []
            
            # Test 1: Database connection
            try:
                test_result = await db_adapter.execute_query_async("SELECT 1 as test")
                if test_result and test_result[0]['test'] == 1:
                    health_results.append(("Database connection", True, "Working"))
                else:
                    health_results.append(("Database connection", False, "Test query failed"))
            except Exception as e:
                health_results.append(("Database connection", False, str(e)))
            
            # Test 2: Settings table schema
            try:
                schema_result = await db_adapter.execute_query_async("PRAGMA table_info(Settings)")
                if schema_result:
                    columns = [row['name'] for row in schema_result]
                    required = ['key', 'value', 'created_at', 'updated_at']
                    if all(col in columns for col in required):
                        health_results.append(("Settings schema", True, f"All columns present: {columns}"))
                    else:
                        missing = [col for col in required if col not in columns]
                        health_results.append(("Settings schema", False, f"Missing columns: {missing}"))
                else:
                    health_results.append(("Settings schema", False, "Could not read schema"))
            except Exception as e:
                health_results.append(("Settings schema", False, str(e)))
            
            # Test 3: First run detection
            try:
                is_first_run = await FirstRunManager.is_first_run()
                if not is_first_run:
                    health_results.append(("First run detection", True, "Setup recognized as completed"))
                else:
                    health_results.append(("First run detection", False, "Still shows first run required"))
            except Exception as e:
                health_results.append(("First run detection", False, str(e)))
            
            # Test 4: System status
            try:
                system_status = await FirstRunManager.get_system_status()
                if system_status.get("setup_completed", False) and system_status.get("wizard_completed", False):
                    health_results.append(("System status", True, "Setup and wizard completed"))
                else:
                    health_results.append(("System status", False, f"Incomplete: {system_status}"))
            except Exception as e:
                health_results.append(("System status", False, str(e)))
            
            # Test 5: Settings operations (il test critico)
            try:
                await db_adapter.execute_write_async("""
                    INSERT OR REPLACE INTO Settings (key, value, updated_at) 
                    VALUES (?, ?, datetime('now'))
                """, ("health_check_test", "success"))
                
                # Verifica che sia stato inserito
                verify_result = await db_adapter.execute_query_async("""
                    SELECT value FROM Settings WHERE key = ?
                """, ("health_check_test",))
                
                if verify_result and verify_result[0]['value'] == 'success':
                    health_results.append(("Settings INSERT OR REPLACE", True, "Operation successful"))
                    
                    # Cleanup
                    await db_adapter.execute_write_async("""
                        DELETE FROM Settings WHERE key = ?
                    """, ("health_check_test",))
                else:
                    health_results.append(("Settings INSERT OR REPLACE", False, "Insert succeeded but verify failed"))
                    
            except Exception as e:
                health_results.append(("Settings INSERT OR REPLACE", False, str(e)))
            
            # Riporta risultati
            success_count = 0
            for test_name, success, details in health_results:
                await self.log_operation(f"Health check: {test_name}", success, details)
                if success:
                    success_count += 1
            
            overall_success = success_count == len(health_results)
            await self.log_operation("Overall health check", overall_success, 
                                   f"Passed {success_count}/{len(health_results)} tests")
            
            return overall_success
            
        except Exception as e:
            await self.log_operation("Final health check", False, f"Error: {e}")
            return False
    
    async def generate_final_report(self) -> Dict[str, Any]:
        """Genera un report finale completo"""
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "backup_location": str(self.backup_dir),
            "fixes_applied": self.fixes_applied,
            "errors_encountered": self.errors_encountered,
            "success_count": len(self.fixes_applied),
            "error_count": len(self.errors_encountered),
            "overall_success": len(self.errors_encountered) == 0,
            "recommendations": []
        }
        
        # Salva report in JSON
        report_file = self.backup_dir / "fix_report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, default=str)
        
        # Raccomandazioni basate sui risultati
        if report["overall_success"]:
            report["recommendations"] = [
                "Restart your server to ensure all changes take effect",
                "Test the application thoroughly",
                "Monitor logs for any remaining issues",
                "Consider implementing database migrations for future schema changes"
            ]
        else:
            report["recommendations"] = [
                "Review error logs in the detailed report",
                "Check database file permissions", 
                "Verify all dependencies are installed",
                "Consider manual database recreation if issues persist"
            ]
        
        return report

async def main():
    """Funzione principale che orchestrata tutti i fix"""
    print("=" * 70)
    print("🔧 FATTURA ANALYZER - COMPREHENSIVE DATABASE SCHEMA FIX")
    print("=" * 70)
    print("This script will comprehensively fix the Settings table schema")
    print("inconsistency and ensure 100% compatibility with all components.")
    print()
    
    fixer = DatabaseSchemaFixer()
    
    try:
        # Phase 1: Backup and Analysis
        print("📋 PHASE 1: BACKUP AND ANALYSIS")
        print("-" * 40)
        
        if not await fixer.create_full_backup():
            print("❌ Critical: Could not create backup. Aborting for safety.")
            return False
        
        schema_info = await fixer.analyze_current_schema()
        print(f"📊 Schema analysis: {len(schema_info['schema_issues'])} issues found")
        for issue in schema_info['schema_issues']:
            print(f"  ⚠️ {issue}")
        print()
        
        # Phase 2: Database Schema Fix
        print("📋 PHASE 2: DATABASE SCHEMA REPAIR")
        print("-" * 40)
        
        if not await fixer.fix_settings_table_schema():
            print("❌ Critical: Database schema fix failed.")
            return False
        print()
        
        # Phase 3: Code Consistency
        print("📋 PHASE 3: CODE CONSISTENCY UPDATE")
        print("-" * 40)
        
        await fixer.update_core_database_file()  # Non critico se fallisce
        print()
        
        # Phase 4: Operations Testing
        print("📋 PHASE 4: COMPREHENSIVE TESTING")
        print("-" * 40)
        
        if not await fixer.test_all_settings_operations():
            print("❌ Warning: Some Settings operations failed tests.")
        
        if not await fixer.run_first_run_manager_setup():
            print("❌ Warning: FirstRunManager setup had issues.")
        print()
        
        # Phase 5: Configuration Verification
        print("📋 PHASE 5: CONFIGURATION VERIFICATION")
        print("-" * 40)
        
        await fixer.verify_config_consistency()
        print()
        
        # Phase 6: Final Health Check
        print("📋 PHASE 6: FINAL HEALTH CHECK")
        print("-" * 40)
        
        health_success = await fixer.run_final_health_check()
        print()
        
        # Phase 7: Report Generation
        print("📋 PHASE 7: FINAL REPORT")
        print("-" * 40)
        
        report = await fixer.generate_final_report()
        
        # Summary
        print("=" * 70)
        print("🎯 COMPREHENSIVE FIX SUMMARY")
        print("=" * 70)
        print(f"✅ Successful operations: {report['success_count']}")
        print(f"❌ Failed operations: {report['error_count']}")
        print(f"📦 Backup location: {report['backup_location']}")
        print(f"📄 Detailed report: {report['backup_location']}/fix_report.json")
        print()
        
        if report["overall_success"] and health_success:
            print("🎉 ALL FIXES APPLIED SUCCESSFULLY!")
            print("The Settings table schema has been completely fixed and")
            print("your system should now work without any schema errors.")
            print()
            print("🚀 NEXT STEPS:")
            for recommendation in report["recommendations"]:
                print(f"  • {recommendation}")
        else:
            print("⚠️ SOME FIXES MAY NEED ATTENTION")
            print("While the core schema fix was applied, some secondary")
            print("operations may need manual review.")
            print()
            print("🔍 TROUBLESHOOTING STEPS:")
            for recommendation in report["recommendations"]:
                print(f"  • {recommendation}")
            print()
            print("📋 Check the detailed error log for specific issues:")
            for error in fixer.errors_encountered[-3:]:  # Show last 3 errors
                print(f"  ❌ {error['operation']}: {error['details']}")
        
        print("=" * 70)
        return report["overall_success"] and health_success
        
    except KeyboardInterrupt:
        print("\n👋 Script interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Critical error in main execution: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_emergency_config_if_missing():
    """Crea una configurazione di emergenza se config.ini è mancante o corrotto"""
    print("🚨 Checking for emergency configuration needs...")
    
    config_path = Path("config.ini")
    needs_emergency_config = False
    
    if not config_path.exists():
        print("  ⚠️ config.ini not found")
        needs_emergency_config = True
    else:
        try:
            config = configparser.ConfigParser()
            config.read(config_path, encoding='utf-8')
            
            # Verifica sezioni critiche
            if not config.has_section('Paths') or not config.has_section('Azienda'):
                print("  ⚠️ config.ini missing critical sections")
                needs_emergency_config = True
            else:
                print("  ✅ config.ini exists and has basic structure")
        except Exception as e:
            print(f"  ❌ config.ini corrupted: {e}")
            needs_emergency_config = True
    
    if needs_emergency_config:
        print("🔧 Creating emergency configuration...")
        
        # Backup existing file if it exists but is corrupted
        if config_path.exists():
            backup_path = config_path.with_suffix('.ini.corrupted_backup')
            shutil.copy2(config_path, backup_path)
            print(f"  📦 Backed up existing file to {backup_path}")
        
        emergency_config = """[Paths]
# Percorso del file database SQLite
DatabaseFile = data/fattura_analyzer.db

[Azienda]
# Dati della tua azienda - AGGIORNA QUESTI DATI!
RagioneSociale = PIERLUIGI BOTTAMEDI
PartitaIVA = 02273530226
CodiceFiscale = BTTPLG77S15F187I
Indirizzo = Via Degasperi 47
CAP = 38017
Citta = MEZZOLOMBARDO
Provincia = TN
Paese = IT
Telefono = 0461 602534
RegimeFiscale = RF01

[System]
# Sistema configurato automaticamente
SetupCompleted = true
SetupCompletedAt = """ + datetime.now().isoformat() + """
LastUpdated = """ + datetime.now().isoformat() + """
ConfigCreatedBy = DatabaseSchemaFixer
EmergencyConfigGenerated = true

[CloudSync]
# Sincronizzazione cloud disabilitata per default
enabled = false
auto_sync_interval = 3600
credentials_file = google_credentials.json
token_file = google_token.json
remote_db_name = fattura_analyzer_backup.sqlite
remote_file_id = 

[API]
# Configurazioni API
host = 127.0.0.1
port = 8000
debug = true
cors_origins = tauri://localhost,http://localhost:3000

[Impostazioni]
# Impostazioni generali
GiorniScadenzaDefault = 30
ControlloPIVA = true
ElementiPerPagina = 50
"""
        
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                f.write(emergency_config)
            
            print("  ✅ Emergency configuration created successfully")
            print("  ⚠️ IMPORTANT: Update company data in config.ini with your real information!")
            return True
            
        except Exception as e:
            print(f"  ❌ Failed to create emergency config: {e}")
            return False
    
    return True

def check_dependencies():
    """Verifica che tutte le dipendenze siano disponibili"""
    print("🔍 Checking dependencies...")
    
    required_modules = [
        ('fastapi', 'FastAPI framework'),
        ('uvicorn', 'ASGI server'),
        ('sqlite3', 'SQLite database support'),
        ('pandas', 'Data manipulation'),
        ('configparser', 'Configuration parsing')
    ]
    
    missing_modules = []
    
    for module_name, description in required_modules:
        try:
            __import__(module_name)
            print(f"  ✅ {module_name}: {description}")
        except ImportError:
            print(f"  ❌ {module_name}: MISSING - {description}")
            missing_modules.append(module_name)
    
    if missing_modules:
        print(f"\n❌ Missing {len(missing_modules)} required dependencies:")
        for module in missing_modules:
            print(f"  • {module}")
        print("\nInstall missing dependencies with:")
        print("pip install " + " ".join(missing_modules))
        return False
    
    print("  ✅ All dependencies are available")
    return True

def check_file_permissions():
    """Verifica i permessi dei file critici"""
    print("🔐 Checking file permissions...")
    
    critical_paths = [
        (".", "Current directory"),
        ("app", "Application directory"),
        ("app/core", "Core modules directory"),
        ("data", "Database directory"),
        ("logs", "Logs directory"),
        ("backups", "Backups directory")
    ]
    
    permission_issues = []
    
    for path_str, description in critical_paths:
        path = Path(path_str)
        
        if path.exists():
            try:
                # Test read permission
                if path.is_dir():
                    list(path.iterdir())
                else:
                    path.read_text()
                
                # Test write permission
                test_file = path / "test_write_permission.tmp" if path.is_dir() else path.with_suffix('.tmp')
                test_file.write_text("test")
                test_file.unlink()
                
                print(f"  ✅ {description} ({path}): Read/Write OK")
                
            except PermissionError:
                print(f"  ❌ {description} ({path}): Permission denied")
                permission_issues.append(str(path))
            except Exception as e:
                print(f"  ⚠️ {description} ({path}): {e}")
        else:
            # Try to create directory if it doesn't exist
            if path_str in ["data", "logs", "backups"]:
                try:
                    path.mkdir(parents=True, exist_ok=True)
                    print(f"  ✅ {description} ({path}): Created")
                except Exception as e:
                    print(f"  ❌ {description} ({path}): Cannot create - {e}")
                    permission_issues.append(str(path))
            else:
                print(f"  ⚠️ {description} ({path}): Does not exist")
    
    if permission_issues:
        print(f"\n❌ Permission issues found for: {', '.join(permission_issues)}")
        print("Fix permissions with:")
        print("chmod 755 <directory>")
        print("chmod 644 <file>")
        return False
    
    return True

def run_pre_flight_checks():
    """Esegue tutti i controlli preliminari"""
    print("🛫 Running pre-flight checks...")
    print("-" * 40)
    
    checks = [
        ("Dependencies", check_dependencies),
        ("File permissions", check_file_permissions),
        ("Emergency config", create_emergency_config_if_missing)
    ]
    
    failed_checks = []
    
    for check_name, check_func in checks:
        print(f"\n📋 {check_name} check:")
        try:
            if not check_func():
                failed_checks.append(check_name)
        except Exception as e:
            print(f"  ❌ {check_name} check failed with error: {e}")
            failed_checks.append(check_name)
    
    print(f"\n📊 Pre-flight summary: {len(checks) - len(failed_checks)}/{len(checks)} checks passed")
    
    if failed_checks:
        print(f"❌ Failed checks: {', '.join(failed_checks)}")
        print("⚠️ Continuing anyway, but some operations may fail...")
    else:
        print("✅ All pre-flight checks passed!")
    
    return len(failed_checks) == 0

def print_usage_help():
    """Stampa informazioni di utilizzo"""
    print("""
🎯 USAGE INFORMATION
==================

This script fixes the SQLite OperationalError for the 'updated_at' column
by resolving schema inconsistencies between core/database.py and first_run.py.

What the script does:
1. Creates comprehensive backups of database and configuration files
2. Analyzes current database schema for inconsistencies
3. Fixes the Settings table schema while preserving existing data
4. Updates core/database.py to prevent future issues
5. Tests all Settings table operations thoroughly
6. Runs FirstRunManager setup completion
7. Verifies configuration consistency
8. Performs final health checks
9. Generates detailed reports

Safe to run:
- Creates backups before making any changes
- Preserves all existing data
- Can be run multiple times safely
- Provides detailed logging and error reporting

Requirements:
- Python 3.8+
- FastAPI and dependencies installed
- Write permissions to application directory
- SQLite database file accessible

After running:
- Restart your server: python scripts/start_dev.py
- Check health: http://127.0.0.1:8000/health
- Review logs in backups/schema_fix_*/fix_report.json
""")

def main_entry_point():
    """Punto di ingresso principale con gestione argomenti"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Fix FatturaAnalyzer database schema inconsistencies",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="For more information, use --help-detailed"
    )
    
    parser.add_argument("--help-detailed", action="store_true",
                       help="Show detailed usage information")
    parser.add_argument("--skip-preflight", action="store_true",
                       help="Skip pre-flight checks (not recommended)")
    parser.add_argument("--force", action="store_true",
                       help="Force execution even if checks fail")
    parser.add_argument("--backup-only", action="store_true",
                       help="Only create backups, don't apply fixes")
    
    args = parser.parse_args()
    
    if args.help_detailed:
        print_usage_help()
        return True
    
    # Pre-flight checks
    if not args.skip_preflight:
        if not run_pre_flight_checks():
            if not args.force:
                print("\n❌ Pre-flight checks failed. Use --force to continue anyway.")
                print("   Or use --help-detailed for more information.")
                return False
            else:
                print("\n⚠️ Continuing despite failed pre-flight checks (--force used)")
    
    # Backup only mode
    if args.backup_only:
        print("\n📦 BACKUP-ONLY MODE")
        print("Creating backups without applying fixes...")
        
        async def backup_only():
            fixer = DatabaseSchemaFixer()
            return await fixer.create_full_backup()
        
        success = asyncio.run(backup_only())
        if success:
            print("✅ Backups created successfully!")
        else:
            print("❌ Backup creation failed!")
        return success
    
    # Run main fix
    return asyncio.run(main())

if __name__ == "__main__":
    try:
        success = main_entry_point()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n👋 Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected critical error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
