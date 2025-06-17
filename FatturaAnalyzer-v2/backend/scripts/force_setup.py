#!/usr/bin/env python3
"""
Script per setup forzato completo - Risolve tutti i problemi di inizializzazione
"""

import sys
import asyncio
from pathlib import Path

# Add path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

async def force_complete_setup():
    """Setup completo forzato"""
    print("🔧 Starting FORCED complete setup...")
    
    # 1. Setup database diretto
    from app.core.database import create_tables
    print("📊 Creating tables directly...")
    create_tables()
    print("✅ Tables created directly")
    
    # 2. Test connessione diretta
    from app.core.database import get_connection
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
        table_count = cursor.fetchone()[0]
        conn.close()
        print(f"✅ Found {table_count} tables in database")
    except Exception as e:
        print(f"❌ Direct connection test failed: {e}")
        return False
    
    # 3. Genera dati di esempio
    try:
        print("🔬 Generating sample data...")
        from scripts.generate_sample_data import main_async
        await main_async()
        print("✅ Sample data generated")
    except Exception as e:
        print(f"⚠️ Sample data generation failed: {e}")
        print("📝 Continuing without sample data...")
    
    # 4. Marca setup come completato (forzato)
    try:
        from app.core.database import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        
        # Crea impostazione che indica setup completato
        cursor.execute("""
            INSERT OR REPLACE INTO Settings (key, value) 
            VALUES ('setup_completed', 'true')
        """)
        cursor.execute("""
            INSERT OR REPLACE INTO Settings (key, value) 
            VALUES ('first_run_completed', 'true')
        """)
        cursor.execute("""
            INSERT OR REPLACE INTO Settings (key, value) 
            VALUES ('database_initialized', 'true')
        """)
        
        conn.commit()
        conn.close()
        print("✅ Setup marked as completed in database")
        
    except Exception as e:
        print(f"⚠️ Could not mark setup as completed: {e}")
    
    print("🎉 FORCED setup completed!")
    return True

def main():
    try:
        success = asyncio.run(force_complete_setup())
        if success:
            print("\n🚀 Ready to start server:")
            print("python scripts\\start_dev.py")
        else:
            print("\n❌ Setup failed!")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Critical error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
