#!/usr/bin/env python3
"""
Script per setup iniziale del database
"""

import asyncio
import sys
from pathlib import Path

# Add path per importare moduli da 'app'
# Lo script è in backend/scripts/, quindi dobbiamo aggiungere backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.adapters.database_adapter import db_adapter
from app.config import settings

async def setup_database():
    """Setup iniziale database"""
    print("🗄️ Setting up database...")
    
    # Crea tabelle
    await db_adapter.create_tables_async()
    print("✅ Tables created/verified")
    
    # Test connessione
    result = await db_adapter.execute_query_async("SELECT 1 as test")
    if result and result[0]["test"] == 1:
        print("✅ Database connection test successful")
    else:
        print("❌ Database connection test failed")
        return False
    
    print(f"📁 Database location: {settings.get_database_path()}")
    return True

def main():
    """Main function"""
    try:
        success = asyncio.run(setup_database())
        if success:
            print("🎉 Database setup completed successfully!")
        else:
            print("❌ Database setup failed!")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
