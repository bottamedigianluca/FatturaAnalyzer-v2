#!/usr/bin/env python3
"""
Script per backup del database
"""

import shutil
import os
import sys
from datetime import datetime
from pathlib import Path

# Add path per importare moduli da 'app'
# Lo script è in backend/scripts/, quindi dobbiamo aggiungere backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings

def create_backup():
    """Crea backup del database"""
    
    # Percorsi
    db_path_str = settings.get_database_path()
    db_path = Path(db_path_str)

    # La cartella backups sarà relativa alla root del backend
    backend_root_dir = Path(__file__).resolve().parent.parent
    backup_dir = backend_root_dir / "backups"
    backup_dir.mkdir(exist_ok=True)
    
    if not db_path.exists():
        print(f"❌ Database not found: {db_path_str}")
        return False
    
    # Nome backup con timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"database_backup_{timestamp}.db"
    backup_file_path = backup_dir / backup_filename
    
    print(f"💾 Creating backup: {backup_file_path}")
    
    try:
        # Copia database
        shutil.copy2(db_path, backup_file_path)
        
        # Verifica backup
        if backup_file_path.exists():
            size_mb = backup_file_path.stat().st_size / (1024 * 1024)
            print(f"✅ Backup created successfully ({size_mb:.2f} MB)")
            
            # Cleanup backup vecchi (mantieni ultimi 10)
            cleanup_old_backups(backup_dir)
            
            return True
        else:
            print("❌ Backup file not created")
            return False
            
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return False

def cleanup_old_backups(backup_dir: Path, keep_count: int = 10):
    """Rimuove backup vecchi"""
    backup_files = list(backup_dir.glob("database_backup_*.db"))
    backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    
    if len(backup_files) > keep_count:
        print(f"Found {len(backup_files)} backups. Keeping the latest {keep_count}.")
        for old_backup in backup_files[keep_count:]:
            try:
                old_backup.unlink()
                print(f"🗑️ Removed old backup: {old_backup.name}")
            except Exception as e:
                print(f"⚠️ Could not remove {old_backup.name}: {e}")

def main():
    """Main function"""
    print("🔄 Starting database backup...")
    
    success = create_backup()
    
    if success:
        print("🎉 Backup completed successfully!")
    else:
        print("❌ Backup failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
