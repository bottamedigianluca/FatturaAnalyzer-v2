import os
import sys
import subprocess
import shutil
from pathlib import Path
import asyncio

# Aggiungi la root del progetto al path per permettere l'import successivo
backend_root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_root_dir))

def find_python_command():
    """Trova il comando Python disponibile, dando priorità a quello del venv."""
    if hasattr(sys, 'prefix') and sys.prefix != sys.base_prefix:
        return sys.executable
    
    python_commands = ['python3', 'python']
    for cmd in python_commands:
        if shutil.which(cmd):
            return cmd
    print("❌ Python non trovato! Installa Python 3.9+.")
    sys.exit(1)

async def initialize_system():
    """Inizializza il database e le tabelle se non esistono."""
    print("🔍 Checking system setup...")
    
    try:
        from app.config import settings
        from app.adapters.database_adapter import db_adapter
        from app.core.database import create_tables # Import diretto per sicurezza
    except ImportError as e:
        print(f"❌ Critical import error: {e}")
        print("Ensure you have run 'pip install -r requirements.txt' in your venv.")
        sys.exit(1)

    db_path = Path(settings.get_database_path())
    
    # Crea la directory 'data' se non esiste
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Controlla se il DB e le tabelle sono già a posto
    try:
        conn_test = db_adapter.get_connection()
        cursor = conn_test.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Invoices';")
        if cursor.fetchone():
            print("✅ Database and tables already exist.")
            conn_test.close()
            return
        conn_test.close()
    except Exception:
        print("⚠️ Database or tables missing. Proceeding with setup.")

    try:
        print(f"   -> Initializing tables in '{db_path}'...")
        await db_adapter.create_tables_async()
        print("✅ Database and tables created successfully.")
        
        print("🌱 Generating sample data...")
        # Usa un import locale per evitare problemi di path
        from scripts.generate_sample_data import main_async as generate_data
        await generate_data()
        print("✅ Sample data generated.")

    except Exception as e:
        print(f"❌ CRITICAL ERROR during database setup: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def start_server(python_cmd):
    """Avvia il server Uvicorn."""
    print("🚀 Starting FastAPI development server...")
    print(f"🔧 Environment: development")
    print(f"🐛 Debug Mode: true")
    print(f"📊 Dashboard: http://127.0.0.1:8000/api/docs")
    print(f"🔍 Health check: http://127.0.0.1:8000/health")
    
    try:
        subprocess.run([
            python_cmd, "-m", "uvicorn",
            "app.main:app",
            "--host", "127.0.0.1",
            "--port", "8000",
            "--log-level", "info",
            "--reload"
        ], check=True)
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Assicurati di essere nella directory corretta
    os.chdir(backend_root_dir)
    
    python_cmd = find_python_command()
    print(f"🐍 Using Python: {python_cmd}")

    # Esegui l'inizializzazione asincrona
    asyncio.run(initialize_system())

    # Avvia il server
    start_server(python_cmd)
