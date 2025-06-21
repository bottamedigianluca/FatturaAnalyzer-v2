#!/usr/bin/env python3
"""
Script per avviare il server di sviluppo - Aggiornato per macOS
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def find_python_command():
    """Trova il comando Python disponibile"""
    # Prova in ordine di preferenza
    python_commands = ['python3', 'python', 'python3.11', 'python3.10', 'python3.9']
    
    for cmd in python_commands:
        if shutil.which(cmd):
            return cmd
    
    print("❌ Python non trovato! Installa Python 3.8+ per continuare.")
    print("Su macOS puoi installarlo con: brew install python")
    sys.exit(1)

def main():
    """Avvia server di sviluppo con configurazione automatica"""
    
    # Trova comando Python
    python_cmd = find_python_command()
    print(f"🐍 Using Python: {python_cmd} ({shutil.which(python_cmd)})")
    
    # Assicurati di essere nella directory corretta
    backend_root_dir = Path(__file__).parent.parent 
    os.chdir(backend_root_dir)
    
    # Set environment variables per sviluppo
    os.environ["ENVIRONMENT"] = "development"
    os.environ["DEBUG"] = "true"
    
    # Verifica requirements
    try:
        subprocess.run([python_cmd, "-c", "import fastapi, uvicorn"], 
                      check=True, capture_output=True)
        print("✅ Dependencies found")
    except subprocess.CalledProcessError:
        print("❌ Missing dependencies!")
        print(f"Run: {python_cmd} -m pip install -r requirements.txt")
        sys.exit(1)
    
    # Verifica config.ini
    if not Path("config.ini").exists(): 
        print("⚠️ config.ini not found in backend root, using defaults")
    
    # Crea directories necessarie
    for dir_name in ["logs", "data", "uploads", "temp"]:
        Path(dir_name).mkdir(exist_ok=True)
    
    print("🚀 Starting FastAPI development server...")
    print(f"🔧 Environment: {os.environ.get('ENVIRONMENT', 'N/A')}")
    print(f"🐛 Debug Mode: {os.environ.get('DEBUG', 'N/A')}")
    print(f"🐍 Python Command: {python_cmd}")
    print("📊 Dashboard: http://127.0.0.1:8000/api/docs")
    print("🔍 Health check: http://127.0.0.1:8000/health")
    print("🎯 First run wizard: http://127.0.0.1:8000/api/first-run/check")
    
    # Avvia server
    try:
        subprocess.run([
            python_cmd, "-m", "uvicorn",
            "app.main:app",
            "--host", "127.0.0.1",
            "--port", "8000",
            "--log-level", "info"
        ], check=True)
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting server: {e}")
        
        # Debugging info
        print("\n🔍 Debug Information:")
        print(f"Python command: {python_cmd}")
        print(f"Working directory: {os.getcwd()}")
        print(f"Python path: {sys.path[:3]}...")
        
        # Check if app.main module exists
        try:
            subprocess.run([python_cmd, "-c", "import app.main"], 
                          check=True, capture_output=True)
            print("✅ app.main module can be imported")
        except subprocess.CalledProcessError as import_error:
            print("❌ Cannot import app.main module")
            print("Make sure you're in the backend directory and dependencies are installed")
        
        sys.exit(1)

if __name__ == "__main__":
    main()
