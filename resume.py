import os
import re
from pathlib import Path

# Config
BASE_DIR_NAME = "FatturaAnalyzer-v2"
MAX_DEPTH_STRUCTURE = 4 # Puoi aumentarla se necessario
# Estensioni di file di cui includere il contenuto (senza commenti se possibile)
# Aggiungi altre estensioni di file di testo rilevanti se necessario
RELEVANT_EXTENSIONS = (
    '.py', '.tsx', '.ts', '.js', '.jsx',  # Codice
    '.rs',                                # Rust
    '.json', '.toml', '.ini', '.yaml', '.yml', # Configurazione
    '.md', '.txt',                        # Testo
    '.sql',                               # SQL
    '.sh', '.bash',                       # Script Shell
    '.css', '.scss', '.less',             # Stili
    '.html', '.xml',                      # Markup
    'Dockerfile', # Trattato come nome file speciale
    '.gitignore', '.env.example' # Nomi file speciali
)

EXCLUDE_DIRS = ['node_modules', '.git', '__pycache__', 'dist', 'build', 'target', '.vscode', '.idea', 'venv', 'env', 'logs', 'public/icons', 'src-tauri/icons'] # Escludi icone binarie
EXCLUDE_FILES = ['extract_project_code.py', 'project_code_extract_for_ai.txt']
MAX_FILE_SIZE_BYTES = 500 * 1024  # 500KB: Limite per evitare file enormi (es. lockfile grandi)
MAX_LINES_TO_OUTPUT = 300 # Limite di righe da outputtare per file, per evitare output eccessivi

def remove_python_comments(code):
    # Rimuove commenti # e docstring multilinea """...""" o '''...'''
    code = re.sub(r'#.*', '', code) # Commenti inline e a fine riga
    # Per i docstring, è più complesso e potrebbe rimuovere stringhe multilinea legittime.
    # Un approccio più semplice è lasciare i docstring (spesso utili per l'AI) o usare ast
    # Per brevità, qui ci concentriamo sui commenti #
    return "\n".join(line for line in code.splitlines() if line.strip())

def remove_js_ts_rust_css_comments(code):
    # Rimuove commenti // e /* ... */
    # Regex per /* ... */ (non-greedy)
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    # Regex per // ...
    code = re.sub(r'//.*', '', code)
    return "\n".join(line for line in code.splitlines() if line.strip())

def remove_html_xml_comments(code):
    code = re.sub(r'<!--.*?-->', '', code, flags=re.DOTALL)
    return "\n".join(line for line in code.splitlines() if line.strip())


def get_clean_content(filepath: Path) -> str:
    try:
        if filepath.stat().st_size > MAX_FILE_SIZE_BYTES:
            return f"(File troppo grande: {filepath.stat().st_size // 1024}KB, saltato)"

        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        ext = filepath.suffix.lower()
        fname = filepath.name

        cleaned_content = content
        if ext == '.py':
            cleaned_content = remove_python_comments(content)
        elif ext in ('.tsx', '.ts', '.js', '.jsx', '.rs', '.css', '.scss', '.less'):
            cleaned_content = remove_js_ts_rust_css_comments(content)
        elif ext in ('.html', '.xml'):
            cleaned_content = remove_html_xml_comments(content)
        elif fname in ('.gitignore', '.env.example'): # Lascia i commenti in questi file perché sono informativi
            cleaned_content = content 
        # Per JSON, TOML, INI, MD, TXT, SQL, SH i commenti sono spesso # o specifici del formato,
        # ma la rimozione generica di # potrebbe essere troppo aggressiva o errata.
        # Li lasciamo così come sono o applichiamo una rimozione # se sicura per l'estensione.
        elif ext in ('.ini', '.sh', '.bash') and '#' in content: # Tentativo per questi
             cleaned_content = re.sub(r'#.*', '', content)
             cleaned_content = "\n".join(line for line in cleaned_content.splitlines() if line.strip())


        # Limita il numero di righe nell'output
        lines = cleaned_content.splitlines()
        if len(lines) > MAX_LINES_TO_OUTPUT:
            cleaned_content = "\n".join(lines[:MAX_LINES_TO_OUTPUT]) + f"\n... (file troncato, {len(lines) - MAX_LINES_TO_OUTPUT} righe omesse)"
        
        return cleaned_content.strip()

    except Exception as e:
        return f"(Errore nella lettura o pulizia del file {filepath.name}: {e})"

def extract_project_details(start_path_str: str):
    output = []
    start_path = Path(start_path_str)

    if not start_path.is_dir():
        return f"Errore: {start_path_str} non è una directory valida."

    output.append(f"ESTRAZIONE CONTENUTO PROGETTO: {start_path.name}")
    output.append("Obiettivo: Fornire contesto dettagliato (struttura e codice pulito) all'AI.")
    output.append("--- INIZIO ESTRAZIONE ---")

    for root, dirs, files in os.walk(start_path, topdown=True):
        current_path = Path(root)
        relative_to_start = current_path.relative_to(start_path)
        depth = len(relative_to_start.parts)

        # Escludi directory
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and (start_path/relative_to_start/d).is_dir()]

        if depth > MAX_DEPTH_STRUCTURE:
            dirs[:] = [] 
            continue

        level_prefix = "  " * depth
        if depth == 0 and current_path.name == start_path.name:
            output.append(f"📁 {current_path.name}/ (ROOT)")
        else:
            output.append(f"\n{level_prefix}📁 {current_path.name}/")
        
        for f_name in sorted(files):
            if f_name in EXCLUDE_FILES:
                continue
            
            file_path = current_path / f_name
            
            # Controlla se l'estensione è rilevante o se è un nome file speciale
            is_relevant = any(f_name.endswith(ext) for ext in RELEVANT_EXTENSIONS) or \
                          f_name in RELEVANT_EXTENSIONS # Per nomi file come Dockerfile

            if is_relevant:
                output.append(f"{level_prefix}  📄 === File: {f_name} ===")
                content = get_clean_content(file_path)
                if content: # Aggiungi solo se c'è contenuto dopo la pulizia
                    output.append(content)
                else:
                    output.append("(File vuoto dopo rimozione commenti o non testuale)")
                output.append(f"{level_prefix}  📄 === Fine File: {f_name} ===")
            # else:
            #     output.append(f"{level_prefix}  • {f_name} (tipo file non incluso nell'estrazione)")


    output.append("\n--- FINE ESTRAZIONE ---")
    return "\n".join(output)

if __name__ == "__main__":
    project_path_to_extract = Path(".")
    if project_path_to_extract.name != BASE_DIR_NAME and (project_path_to_extract / BASE_DIR_NAME).exists():
        project_path_to_extract = project_path_to_extract / BASE_DIR_NAME
    
    if not project_path_to_extract.is_dir() or project_path_to_extract.name != BASE_DIR_NAME:
        print(f"ERRORE: La cartella del progetto '{BASE_DIR_NAME}' non è stata trovata.")
        print(f"Esegui lo script da '{BASE_DIR_NAME}' o dalla sua cartella genitore.")
        exit(1)

    description_text = extract_project_details(str(project_path_to_extract))
    
    # Stampa a console (potrebbe essere molto lungo)
    # print(description_text) 

    description_file_path = project_path_to_extract / "project_code_extract_for_ai.txt"
    try:
        with open(description_file_path, "w", encoding="utf-8") as f:
            f.write(description_text)
        print(f"\nEstrazione dettagliata del codice salvata in: {description_file_path.resolve()}")
        print(f"ATTENZIONE: Questo file può essere MOLTO grande.")
    except Exception as e:
        print(f"\nErrore nel salvare il file di estrazione: {e}")