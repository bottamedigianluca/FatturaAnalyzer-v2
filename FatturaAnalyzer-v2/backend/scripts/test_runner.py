#!/usr/bin/env python3
"""
Script per eseguire test con configurazioni diverse
"""

import os
import sys
import subprocess
from pathlib import Path

def run_tests(test_type="all", coverage=True, verbose=False):
    """Esegue test con configurazioni specifiche"""
    
    # Set environment per test
    os.environ["ENVIRONMENT"] = "test"
    os.environ["DATABASE_PATH"] = ":memory:" # Assicura che i test usino un DB in memoria
    
    # La directory di lavoro per pytest dovrebbe essere la root del backend
    backend_root_dir = Path(__file__).parent.parent

    cmd = [sys.executable, "-m", "pytest"] # Usa sys.executable per Python corretto
    
    # Configurazioni per tipo di test
    if test_type == "unit":
        cmd.extend(["-m", "unit"]) # Assicurati di avere marker 'unit' nei tuoi test
    elif test_type == "integration":
        cmd.extend(["-m", "integration"]) # Assicurati di avere marker 'integration'
    elif test_type == "api":
        cmd.extend(["-m", "api"]) # Assicurati di avere marker 'api'
    elif test_type == "fast":
        cmd.extend(["-m", "not slow"]) # Assicurati di avere marker 'slow' per test lunghi
    elif test_type == "all":
        pass  # Esegue tutti i test
    
    # Coverage
    if coverage:
        cmd.extend([
            "--cov=app", # Specifica il package/modulo da cui calcolare la coverage
            "--cov-report=html",
            "--cov-report=term-missing"
        ])
    
    # Verbose output
    if verbose:
        cmd.append("-v")
    else:
        cmd.append("-q") # Meno output, utile per CI
    
    # Altri flag utili
    cmd.extend([
        "--tb=short",      # Formato traceback più corto
        "--strict-markers", # Fallisce se ci sono marker non registrati
        # "--disable-warnings" # Potrebbe nascondere problemi, usa con cautela
    ])
    
    print(f"🧪 Running {test_type} tests from directory: {backend_root_dir}")
    print(f"📋 Command: {' '.join(cmd)}")
    
    try:
        # Esegui pytest dalla directory root del backend
        result = subprocess.run(cmd, cwd=backend_root_dir)
        return result.returncode == 0
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted")
        return False
    except FileNotFoundError:
        print(f"❌ Pytest command not found. Is pytest installed in '{sys.executable}'?")
        return False


def main():
    """Main function con parsing argomenti"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Run tests with different configurations")
    parser.add_argument("--type", choices=["all", "unit", "integration", "api", "fast"], 
                       default="all", help="Type of tests to run (requires markers in tests)")
    parser.add_argument("--no-coverage", action="store_true", help="Disable coverage")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    success = run_tests(
        test_type=args.type,
        coverage=not args.no_coverage,
        verbose=args.verbose
    )
    
    if success:
        print("✅ All tests passed!")
        if not args.no_coverage:
            # La coverage report HTML sarà in backend/htmlcov/
            print(f"📊 Coverage report: {Path('htmlcov/index.html').resolve()}")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
