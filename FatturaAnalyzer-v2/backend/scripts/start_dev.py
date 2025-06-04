#!/usr/bin/env python3
"""
Script per avviare il server di sviluppo
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Avvia server di sviluppo con configurazione automatica"""
    
    # Assicurati di essere nella directory corretta (la directory genitore di 'scripts')
    # che dovrebbe essere la root del backend
    backend_root_dir = Path(__file__).parent.parent 
    os.chdir(backend_root_dir)
    
    # Set environment variables per sviluppo
    os.environ["ENVIRONMENT"] = "development"
    os.environ["DEBUG"] = "true"
    
    # Verifica requirements
    try:
        import fastapi
        import uvicorn
        print("✅ Dependencies found")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run: pip install -r requirements.txt")
        sys.exit(1)
    
    # Verifica config.ini
    # Cerca config.ini nella root del backend
    if not Path("config.ini").exists(): 
        print("⚠️ config.ini not found in backend root, using defaults")
    
    # Crea directories necessarie (nella root del backend)
    for dir_name in ["logs", "data", "uploads", "temp"]:
        Path(dir_name).mkdir(exist_ok=True)
    
    print("🚀 Starting FastAPI development server...")
    print(f"🔧 Environment: {os.environ.get('ENVIRONMENT', 'N/A')}")
    print(f"🐛 Debug Mode: {os.environ.get('DEBUG', 'N/A')}")
    print("📊 Dashboard: http://127.0.0.1:8000/api/docs")
    print("🔍 Health check: http://127.0.0.1:8000/health")
    
    # Avvia server
    try:
        # Assicurati che app.main:app sia corretto rispetto alla posizione di esecuzione
        # Lo script si esegue dalla root del backend, quindi "app.main:app" è corretto
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "app.main:app", # Modulo e istanza FastAPI
            "--host", "127.0.0.1",
            "--port", "8000",
            "--reload",
            "--log-level", "info"
        ], check=True)
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
