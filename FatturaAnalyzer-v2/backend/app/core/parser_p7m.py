# core/parser_p7m.py - Versione migliorata per gestire meglio i file P7M

import subprocess
import tempfile
import os
import logging
import re
import shutil
from lxml import etree
import sys

logger = logging.getLogger(__name__)

OPENSSL_CMD = 'openssl'

def find_openssl():
    """Trova l'eseguibile openssl nel sistema con ricerca più estesa."""
    # Prima prova con which/where
    cmd_path = shutil.which(OPENSSL_CMD)
    if cmd_path and os.path.isfile(cmd_path):
        logger.info(f"Trovato OpenSSL (which): '{cmd_path}'")
        return cmd_path
    
    # Percorsi comuni per sistema operativo
    common_paths = []
    if sys.platform == "win32":
        common_paths = [
            # Git Bash
            os.path.join(os.environ.get("ProgramFiles", "C:\\Program Files"), "Git\\usr\\bin\\openssl.exe"),
            os.path.join(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"), "Git\\usr\\bin\\openssl.exe"),
            # OpenSSL standalone
            os.path.join(os.environ.get("ProgramFiles", "C:\\Program Files"), "OpenSSL-Win64\\bin\\openssl.exe"),
            os.path.join(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"), "OpenSSL-Win32\\bin\\openssl.exe"),
            "C:\\Program Files\\OpenSSL\\bin\\openssl.exe",
            "C:\\OpenSSL-Win64\\bin\\openssl.exe",
            "C:\\OpenSSL-Win32\\bin\\openssl.exe",
            # Chocolatey
            "C:\\ProgramData\\chocolatey\\bin\\openssl.exe",
            # MSYS2
            "C:\\msys64\\usr\\bin\\openssl.exe",
            # Altri percorsi comuni
            "C:\\tools\\openssl\\openssl.exe",
        ]
    elif sys.platform == "darwin":  # macOS
        common_paths = [
            '/usr/bin/openssl',
            '/usr/local/bin/openssl',
            '/opt/homebrew/bin/openssl',  # Apple Silicon
            '/opt/local/bin/openssl',     # MacPorts
            '/sw/bin/openssl',            # Fink
        ]
    else:  # Linux e altri Unix
        common_paths = [
            '/usr/bin/openssl',
            '/usr/local/bin/openssl',
            '/bin/openssl',
            '/usr/sbin/openssl',
            '/opt/openssl/bin/openssl',
        ]
    
    # Verifica percorsi comuni
    for p in common_paths:
        if os.path.exists(p) and os.access(p, os.X_OK):
            logger.info(f"Trovato OpenSSL (common path): '{p}'")
            return p
    
    # Verifica finale nel PATH
    try:
        use_shell = sys.platform == "win32"
        result = subprocess.run(
            [OPENSSL_CMD, 'version'], 
            capture_output=True, 
            check=True, 
            text=True, 
            timeout=10, 
            shell=use_shell
        )
        if result.returncode == 0:
            logger.info(f"OpenSSL trovato nel PATH: versione {result.stdout.strip()}")
            return OPENSSL_CMD
    except Exception as e_check:
        logger.debug(f"Verifica OpenSSL PATH fallita: {e_check}")
    
    logger.critical(f"FATAL: Comando '{OPENSSL_CMD}' non trovato nel sistema.")
    return None

def _cleanup_temp_file(filepath):
    """Rimuove un file temporaneo se esiste."""
    if filepath and os.path.exists(filepath):
        try:
            os.remove(filepath)
            logger.debug(f"File temp rimosso: {filepath}")
        except OSError as e:
            logger.warning(f"Impossibile rimuovere file temp {filepath}: {e}")

def _validate_extracted_xml(xml_path, base_name):
    """
    Valida che l'XML estratto sia effettivamente una fattura elettronica valida.
    """
    try:
        if not os.path.exists(xml_path) or os.path.getsize(xml_path) == 0:
            logger.error(f"File XML estratto vuoto o inesistente: {xml_path}")
            return False
        
        # Leggi e verifica contenuto
        with open(xml_path, 'rb') as f:
            xml_bytes = f.read()
        
        if not xml_bytes:
            logger.error(f"Contenuto XML vuoto per {base_name}")
            return False
        
        # Verifica se sembra un XML di fattura elettronica
        xml_str = xml_bytes.decode('utf-8', errors='ignore').lower()
        
        # Controlli di base per fattura elettronica
        fattura_keywords = [
            'fatturaelettronica',
            'fatturaelettronicaheader',
            'fatturaelettronicabody',
            'cedenteprestatore',
            'cessionariocommittente'
        ]
        
        keyword_found = any(keyword in xml_str for keyword in fattura_keywords)
        
        if not keyword_found:
            logger.warning(f"Il contenuto estratto da {base_name} non sembra una fattura elettronica")
            # Log primi 200 caratteri per debug
            preview = xml_str[:200].replace('\n', ' ').replace('\r', ' ')
            logger.debug(f"Preview contenuto: {preview}")
            return False
        
        # Prova parsing XML base per verificare validità
        try:
            parser = etree.XMLParser(recover=True)
            etree.fromstring(xml_bytes, parser)
            logger.debug(f"XML estratto validato per {base_name}")
            return True
        except etree.XMLSyntaxError as xml_err:
            logger.error(f"XML estratto da {base_name} non valido: {xml_err}")
            return False
    
    except Exception as validate_err:
        logger.error(f"Errore validazione XML estratto da {base_name}: {validate_err}")
        return False

def extract_xml_from_p7m_smime_robust(openssl_path, p7m_filepath, base_name):
    """
    Estrazione P7M più robusta con multiple strategie di estrazione.
    """
    temp_xml_file_path = None
    logger.info(f"Tentativo estrazione XML da {base_name} con strategia robusta...")
    
    try:
        # Crea file temporaneo
        tf = tempfile.NamedTemporaryFile(
            delete=False, 
            mode='wb', 
            suffix=".xml", 
            prefix=f"{base_name}_extract_"
        )
        temp_xml_file_path = tf.name
        tf.close()

        # Strategia 1: smime -verify con -noverify (standard)
        strategies = [
            {
                'name': 'smime_noverify',
                'command': [openssl_path, 'smime', '-verify', '-noverify', '-inform', 'DER', 
                           '-in', p7m_filepath, '-out', temp_xml_file_path]
            },
            {
                'name': 'smime_noverify_nosigs',
                'command': [openssl_path, 'smime', '-verify', '-noverify', '-nosigs', '-inform', 'DER',
                           '-in', p7m_filepath, '-out', temp_xml_file_path]
            },
            {
                'name': 'pkcs7_print',
                'command': [openssl_path, 'pkcs7', '-print', '-inform', 'DER', 
                           '-in', p7m_filepath, '-out', temp_xml_file_path]
            }
        ]

        for i, strategy in enumerate(strategies):
            try:
                logger.debug(f"Strategia {i+1}/{len(strategies)} ({strategy['name']}): {' '.join(strategy['command'])}")
                
                # Esegui comando
                process = subprocess.run(
                    strategy['command'], 
                    capture_output=True, 
                    check=False,  # Non fare raise su errori
                    timeout=60,   # Timeout più lungo per file grandi
                    text=False    # Mantieni output binario
                )
                
                stderr_output = process.stderr.decode('utf-8', errors='ignore') if process.stderr else ""
                
                # Log del risultato
                logger.debug(f"Strategia {strategy['name']}: RC={process.returncode}")
                if stderr_output:
                    logger.debug(f"Stderr: {stderr_output[:200]}")
                
                # Valida l'output indipendentemente dal return code
                if _validate_extracted_xml(temp_xml_file_path, base_name):
                    logger.info(f"Estrazione riuscita con strategia {strategy['name']} per {base_name}")
                    return temp_xml_file_path
                else:
                    logger.debug(f"Strategia {strategy['name']} ha prodotto output non valido")
                    continue
                    
            except subprocess.TimeoutExpired:
                logger.warning(f"Timeout strategia {strategy['name']} per {base_name}")
                continue
            except Exception as strategy_err:
                logger.debug(f"Errore strategia {strategy['name']} per {base_name}: {strategy_err}")
                continue
        
        # Se tutte le strategie falliscono
        logger.error(f"Tutte le strategie di estrazione fallite per {base_name}")
        _cleanup_temp_file(temp_xml_file_path)
        return None

    except Exception as e:
        logger.error(f"Errore critico estrazione P7M per {base_name}: {e}", exc_info=True)
        _cleanup_temp_file(temp_xml_file_path)
        return None

def extract_xml_from_p7m_alternative_methods(p7m_filepath, base_name):
    """
    Metodi alternativi per estrarre XML da P7M quando OpenSSL fallisce.
    Usa librerie Python pure quando disponibili.
    """
    logger.info(f"Tentativo estrazione alternativa per {base_name}")
    
    try:
        # Metodo 1: Lettura diretta per cercare contenuto XML embedded
        with open(p7m_filepath, 'rb') as f:
            p7m_content = f.read()
        
        # Cerca pattern XML nel contenuto binario
        xml_patterns = [
            rb'<?xml[^>]*>\s*<.*?FatturaElettronica',
            rb'<.*?FatturaElettronica',
            rb'<?xml[^>]*>\s*<.*?fattura',
        ]
        
        for pattern in xml_patterns:
            matches = re.search(pattern, p7m_content, re.IGNORECASE | re.DOTALL)
            if matches:
                # Trova l'inizio dell'XML
                xml_start = matches.start()
                
                # Trova la fine guardando per il tag di chiusura
                xml_end_patterns = [
                    rb'</.*?FatturaElettronica[^>]*>',
                    rb'</.*?fattura[^>]*>',
                ]
                
                xml_end = len(p7m_content)  # Default alla fine del file
                for end_pattern in xml_end_patterns:
                    end_matches = list(re.finditer(end_pattern, p7m_content[xml_start:], re.IGNORECASE))
                    if end_matches:
                        last_match = end_matches[-1]
                        xml_end = xml_start + last_match.end()
                        break
                
                # Estrai XML
                xml_content = p7m_content[xml_start:xml_end]
                
                # Pulisci contenuto XML
                try:
                    xml_str = xml_content.decode('utf-8', errors='ignore')
                    
                    # Verifica che sia XML valido
                    parser = etree.XMLParser(recover=True)
                    etree.fromstring(xml_str.encode('utf-8'), parser)
                    
                    # Salva in file temporaneo
                    tf = tempfile.NamedTemporaryFile(
                        delete=False, 
                        mode='w', 
                        suffix=".xml", 
                        prefix=f"{base_name}_alt_",
                        encoding='utf-8'
                    )
                    tf.write(xml_str)
                    tf.close()
                    
                    logger.info(f"Estrazione alternativa riuscita per {base_name}: {tf.name}")
                    return tf.name
                    
                except Exception as xml_process_err:
                    logger.debug(f"Errore processamento XML estratto: {xml_process_err}")
                    continue
        
        logger.warning(f"Nessun contenuto XML trovato con metodi alternativi in {base_name}")
        return None
        
    except Exception as e:
        logger.error(f"Errore metodi alternativi per {base_name}: {e}")
        return None

def detect_p7m_structure(p7m_filepath):
    """
    Analizza la struttura del file P7M per determinare la strategia di estrazione migliore.
    """
    try:
        with open(p7m_filepath, 'rb') as f:
            header = f.read(1024)  # Leggi primi 1KB
        
        structure_info = {
            'size': os.path.getsize(p7m_filepath),
            'has_xml_header': b'<?xml' in header,
            'has_fattura_tag': b'fattura' in header.lower(),
            'encoding_hints': []
        }
        
        # Detect encoding hints
        if b'utf-8' in header.lower():
            structure_info['encoding_hints'].append('utf-8')
        if b'iso-8859' in header.lower():
            structure_info['encoding_hints'].append('iso-8859-1')
        
        # Detect PKCS#7 structure
        if header.startswith(b'\x30\x82') or header.startswith(b'\x30\x80'):
            structure_info['pkcs7_structure'] = 'DER'
        elif header.startswith(b'-----BEGIN'):
            structure_info['pkcs7_structure'] = 'PEM'
        else:
            structure_info['pkcs7_structure'] = 'Unknown'
        
        logger.debug(f"Struttura P7M rilevata: {structure_info}")
        return structure_info
        
    except Exception as e:
        logger.warning(f"Errore analisi struttura P7M: {e}")
        return {'size': 0, 'pkcs7_structure': 'Unknown'}

def extract_xml_from_p7m(p7m_filepath):
    """
    Funzione principale migliorata per estrazione XML da P7M.
    Usa multiple strategie per massimizzare il successo.
    """
    if not os.path.exists(p7m_filepath):
        logger.error(f"File P7M non trovato: {p7m_filepath}")
        return None
    
    base_name = os.path.basename(p7m_filepath)
    logger.info(f"Inizio estrazione XML da P7M: {base_name}")
    
    # Analizza struttura file
    structure_info = detect_p7m_structure(p7m_filepath)
    
    # Trova OpenSSL
    openssl_path = find_openssl()
    
    extracted_path = None
    
    # Strategia 1: OpenSSL (se disponibile)
    if openssl_path:
        logger.info(f"Tentativo estrazione con OpenSSL per {base_name}")
        extracted_path = extract_xml_from_p7m_smime_robust(openssl_path, p7m_filepath, base_name)
    else:
        logger.warning(f"OpenSSL non disponibile, salto estrazione OpenSSL per {base_name}")
    
    # Strategia 2: Metodi alternativi se OpenSSL fallisce
    if not extracted_path:
        logger.info(f"Tentativo estrazione con metodi alternativi per {base_name}")
        extracted_path = extract_xml_from_p7m_alternative_methods(p7m_filepath, base_name)
    
    # Strategia 3: Tentativo con librerie esterne se disponibili
    if not extracted_path:
        extracted_path = try_external_libraries_extraction(p7m_filepath, base_name)
    
    if extracted_path:
        logger.info(f"Estrazione XML completata con successo: {base_name} -> {extracted_path}")
        
        # Log dimensioni per verifica
        try:
            xml_size = os.path.getsize(extracted_path)
            p7m_size = structure_info.get('size', 0)
            logger.debug(f"Dimensioni: P7M={p7m_size} bytes, XML estratto={xml_size} bytes")
        except:
            pass
            
        return extracted_path
    else:
        logger.error(f"Tutte le strategie di estrazione fallite per {base_name}")
        return None

def try_external_libraries_extraction(p7m_filepath, base_name):
    """
    Tenta estrazione usando librerie Python esterne se disponibili.
    """
    try:
        # Prova con cryptography library se disponibile
        try:
            from cryptography.hazmat.primitives import serialization
            from cryptography.hazmat.primitives.serialization import pkcs7
            
            logger.debug(f"Tentativo estrazione con cryptography library per {base_name}")
            
            with open(p7m_filepath, 'rb') as f:
                p7m_data = f.read()
            
            # Prova a parsare come PKCS#7
            try:
                # Carica il certificato PKCS#7
                p7m_cert = pkcs7.load_der_pkcs7_certificates(p7m_data)
                logger.debug(f"PKCS#7 caricato, ma cryptography non supporta estrazione contenuto")
                # La libreria cryptography non supporta l'estrazione del contenuto
                # È principalmente per gestione certificati
                
            except Exception as crypto_err:
                logger.debug(f"Errore caricamento PKCS#7 con cryptography: {crypto_err}")
                
        except ImportError:
            logger.debug("Libreria cryptography non disponibile")
        
        # Prova con altre librerie se disponibili
        try:
            import M2Crypto
            logger.debug(f"Tentativo estrazione con M2Crypto per {base_name}")
            # Implementazione M2Crypto qui se necessario
            
        except ImportError:
            logger.debug("Libreria M2Crypto non disponibile")
        
        return None
        
    except Exception as e:
        logger.debug(f"Errore tentativo librerie esterne per {base_name}: {e}")
        return None

def verify_extraction_quality(extracted_xml_path, original_p7m_path):
    """
    Verifica la qualità dell'estrazione confrontando con l'originale.
    """
    try:
        base_name = os.path.basename(original_p7m_path)
        
        # Controlli di base
        if not os.path.exists(extracted_xml_path):
            logger.error(f"File XML estratto non esiste: {extracted_xml_path}")
            return False
        
        xml_size = os.path.getsize(extracted_xml_path)
        if xml_size == 0:
            logger.error(f"File XML estratto vuoto per {base_name}")
            return False
        
        # Verifica contenuto XML
        try:
            with open(extracted_xml_path, 'r', encoding='utf-8', errors='ignore') as f:
                xml_content = f.read(1000)  # Primi 1000 caratteri
            
            # Controlli qualità contenuto
            quality_checks = {
                'has_xml_declaration': xml_content.strip().startswith('<?xml'),
                'has_fattura_tag': 'FatturaElettronica' in xml_content or 'fattura' in xml_content.lower(),
                'has_proper_structure': any(tag in xml_content for tag in ['CedentePrestatore', 'CessionarioCommittente']),
                'no_binary_garbage': not any(ord(c) < 32 and c not in '\n\r\t' for c in xml_content[:500])
            }
            
            passed_checks = sum(quality_checks.values())
            total_checks = len(quality_checks)
            
            logger.debug(f"Controlli qualità per {base_name}: {passed_checks}/{total_checks} passati")
            logger.debug(f"Dettagli: {quality_checks}")
            
            # Almeno 3/4 controlli devono passare
            if passed_checks >= 3:
                logger.info(f"Estrazione di buona qualità per {base_name}")
                return True
            else:
                logger.warning(f"Estrazione di qualità dubbia per {base_name}: {passed_checks}/{total_checks} controlli passati")
                return False
                
        except Exception as content_err:
            logger.error(f"Errore verifica contenuto XML per {base_name}: {content_err}")
            return False
            
    except Exception as e:
        logger.error(f"Errore verifica qualità estrazione: {e}")
        return False

# Funzione di utilità per testing e debug
def test_p7m_extraction(p7m_filepath, verbose=True):
    """
    Funzione di test per verificare l'estrazione P7M.
    Utile per debugging di file problematici.
    """
    if verbose:
        print(f"\n=== TEST ESTRAZIONE P7M ===")
        print(f"File: {p7m_filepath}")
        print(f"Esiste: {os.path.exists(p7m_filepath)}")
        
        if os.path.exists(p7m_filepath):
            print(f"Dimensione: {os.path.getsize(p7m_filepath)} bytes")
    
    # Test OpenSSL availability
    openssl_path = find_openssl()
    if verbose:
        print(f"OpenSSL disponibile: {openssl_path is not None}")
        if openssl_path:
            print(f"Percorso OpenSSL: {openssl_path}")
    
    # Analizza struttura
    structure = detect_p7m_structure(p7m_filepath)
    if verbose:
        print(f"Struttura rilevata: {structure}")
    
    # Tenta estrazione
    extracted_path = extract_xml_from_p7m(p7m_filepath)
    
    if verbose:
        print(f"Estrazione riuscita: {extracted_path is not None}")
        if extracted_path:
            print(f"File estratto: {extracted_path}")
            print(f"Dimensione estratto: {os.path.getsize(extracted_path)} bytes")
            
            # Verifica qualità
            quality_ok = verify_extraction_quality(extracted_path, p7m_filepath)
            print(f"Qualità estrazione: {'OK' if quality_ok else 'PROBLEMATICA'}")
        
        print("=" * 40)
    
    return extracted_path