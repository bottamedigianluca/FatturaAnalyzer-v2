"""
Importer Adapter per FastAPI - Versione Completa
Fornisce interfaccia async per il core/importer.py esistente senza modificarlo
Include tutte le funzionalità necessarie per l'API
"""

import asyncio
import logging
import tempfile
import os
import shutil
from typing import Dict, Any, Callable, Optional, List, Union
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
from io import StringIO, BytesIO

# Import del core esistente (INVARIATO)
from app.core.importer import import_from_source
from app.core.parser_csv import parse_bank_csv
from app.core.parser_xml import parse_fattura_xml
from app.core.parser_p7m import extract_xml_from_p7m

logger = logging.getLogger(__name__)

# Thread pool per operazioni sincrone del core
_thread_pool = ThreadPoolExecutor(max_workers=4)

class ImporterAdapter:
    """
    Adapter che fornisce interfaccia async per gli importer del core esistente
    Include tutte le funzionalità per l'API di import/export
    """
    
    @staticmethod
    async def import_from_source_async(
        source_path: str,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Versione async di import_from_source"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            import_from_source,
            source_path,
            progress_callback
        )
    
    @staticmethod
    async def parse_bank_csv_async(csv_content: Union[str, BytesIO]) -> Optional[pd.DataFrame]:
        """Versione async di parse_bank_csv che gestisce sia string che BytesIO"""
        def _parse_csv():
            if isinstance(csv_content, str):
                csv_file = StringIO(csv_content)
                return parse_bank_csv(csv_file)
            elif isinstance(csv_content, BytesIO):
                # Per BytesIO, salva temporaneamente su file
                with tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False) as temp_file:
                    temp_file.write(csv_content.getvalue())
                    temp_file_path = temp_file.name
                
                try:
                    return parse_bank_csv(temp_file_path)
                finally:
                    if os.path.exists(temp_file_path):
                        os.unlink(temp_file_path)
            else:
                raise ValueError("csv_content deve essere str o BytesIO")
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _parse_csv)
    
    @staticmethod
    async def parse_fattura_xml_async(
        xml_filepath: str,
        my_company_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Versione async di parse_fattura_xml"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            parse_fattura_xml,
            xml_filepath,
            my_company_data
        )
    
    @staticmethod
    async def extract_xml_from_p7m_async(p7m_filepath: str) -> Optional[str]:
        """Versione async di extract_xml_from_p7m"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            extract_xml_from_p7m,
            p7m_filepath
        )
    
    # === NUOVE FUNZIONALITÀ PER L'API ===
    
    @staticmethod
    async def import_invoices_from_files_async(
        files_data: List[Dict[str, Any]],
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Importa fatture da una lista di file (XML/P7M)
        files_data: Lista di dict con 'filename', 'content' (bytes), 'content_type'
        """
        def _import_invoices():
            # Crea directory temporanea per i file
            with tempfile.TemporaryDirectory(prefix="invoice_import_") as temp_dir:
                temp_files = []
                
                # Salva tutti i file temporaneamente
                for file_info in files_data:
                    filename = file_info['filename']
                    content = file_info['content']
                    
                    # Sanitizza nome file
                    safe_filename = "".join(c for c in filename if c.isalnum() or c in (' ', '.', '_', '-')).rstrip()
                    temp_path = os.path.join(temp_dir, safe_filename)
                    
                    with open(temp_path, 'wb') as f:
                        f.write(content)
                    
                    temp_files.append(temp_path)
                
                # Chiama import_from_source con la directory temporanea
                return import_from_source(temp_dir, progress_callback)
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _import_invoices)
    
    @staticmethod
    async def import_single_invoice_async(
        filename: str,
        content: bytes,
        my_company_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Importa una singola fattura da contenuto file
        """
        def _import_single():
            with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1], delete=False) as temp_file:
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            try:
                # Determina tipo file ed elabora
                _, ext = os.path.splitext(filename)
                ext = ext.lower()
                
                if ext == '.p7m':
                    # Estrai XML da P7M
                    xml_path = extract_xml_from_p7m(temp_file_path)
                    if not xml_path:
                        return {'error': 'Impossibile estrarre XML da P7M'}
                    
                    try:
                        # Parsa XML estratto
                        result = parse_fattura_xml(xml_path, my_company_data)
                        return result
                    finally:
                        if os.path.exists(xml_path):
                            os.unlink(xml_path)
                
                elif ext == '.xml':
                    # Parsa direttamente XML
                    return parse_fattura_xml(temp_file_path, my_company_data)
                
                else:
                    return {'error': f'Formato file non supportato: {ext}'}
                    
            finally:
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _import_single)
    
    @staticmethod
    async def validate_csv_format_async(csv_content: Union[str, bytes]) -> Dict[str, Any]:
        """
        Valida formato CSV per movimenti bancari
        """
        def _validate_csv():
            try:
                # Converti bytes in string se necessario
                if isinstance(csv_content, bytes):
                    # Prova diversi encoding
                    for encoding in ['utf-8', 'latin-1', 'cp1252']:
                        try:
                            content_str = csv_content.decode(encoding)
                            break
                        except UnicodeDecodeError:
                            continue
                    else:
                        return {
                            'valid': False,
                            'error': 'Impossibile decodificare il file CSV',
                            'details': 'Encoding non supportato'
                        }
                else:
                    content_str = csv_content
                
                # Prova a parsare il CSV
                csv_file = StringIO(content_str)
                df = parse_bank_csv(csv_file)
                
                if df is None:
                    return {
                        'valid': False,
                        'error': 'Formato CSV non valido',
                        'details': 'Impossibile parsare il contenuto CSV'
                    }
                
                if df.empty:
                    return {
                        'valid': False,
                        'error': 'CSV vuoto',
                        'details': 'Nessun dato trovato nel file'
                    }
                
                # Analizza contenuto
                required_columns = ['DataContabile', 'Importo', 'Descrizione']
                missing_columns = [col for col in required_columns if col not in df.columns]
                
                if missing_columns:
                    return {
                        'valid': False,
                        'error': 'Colonne mancanti',
                        'details': f'Colonne richieste mancanti: {", ".join(missing_columns)}'
                    }
                
                # Statistiche del dataset
                stats = {
                    'total_rows': len(df),
                    'valid_transactions': len(df[df['Importo'].notna()]),
                    'date_range': {
                        'from': df['DataContabile'].min().isoformat() if not df['DataContabile'].empty else None,
                        'to': df['DataContabile'].max().isoformat() if not df['DataContabile'].empty else None
                    },
                    'amount_range': {
                        'min': float(df['Importo'].min()) if not df['Importo'].empty else 0,
                        'max': float(df['Importo'].max()) if not df['Importo'].empty else 0
                    }
                }
                
                return {
                    'valid': True,
                    'message': 'CSV valido',
                    'statistics': stats,
                    'preview': df.head(5).to_dict('records')
                }
                
            except Exception as e:
                return {
                    'valid': False,
                    'error': 'Errore validazione CSV',
                    'details': str(e)
                }
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _validate_csv)
    
    @staticmethod
    async def get_csv_preview_async(
        csv_content: Union[str, bytes],
        max_rows: int = 10
    ) -> Dict[str, Any]:
        """
        Ottiene anteprima del contenuto CSV
        """
        def _get_preview():
            try:
                # Converti bytes in string se necessario
                if isinstance(csv_content, bytes):
                    content_str = csv_content.decode('utf-8', errors='replace')
                else:
                    content_str = csv_content
                
                # Parsea CSV per anteprima
                csv_file = StringIO(content_str)
                df = parse_bank_csv(csv_file)
                
                if df is None or df.empty:
                    return {
                        'success': False,
                        'error': 'Impossibile leggere CSV'
                    }
                
                # Prepara anteprima
                preview_df = df.head(max_rows)
                
                return {
                    'success': True,
                    'total_rows': len(df),
                    'preview_rows': len(preview_df),
                    'columns': list(df.columns),
                    'data': preview_df.to_dict('records'),
                    'summary': {
                        'earliest_date': df['DataContabile'].min().isoformat() if 'DataContabile' in df.columns else None,
                        'latest_date': df['DataContabile'].max().isoformat() if 'DataContabile' in df.columns else None,
                        'total_amount': float(df['Importo'].sum()) if 'Importo' in df.columns else 0,
                        'positive_transactions': len(df[df['Importo'] > 0]) if 'Importo' in df.columns else 0,
                        'negative_transactions': len(df[df['Importo'] < 0]) if 'Importo' in df.columns else 0
                    }
                }
                
            except Exception as e:
                return {
                    'success': False,
                    'error': f'Errore anteprima CSV: {str(e)}'
                }
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_preview)
    
    @staticmethod
    async def create_csv_template_async() -> bytes:
        """
        Crea template CSV per import movimenti bancari
        """
        def _create_template():
            template_data = {
                'DATA': ['2024-01-15', '2024-01-16', '2024-01-17'],
                'VALUTA': ['2024-01-15', '2024-01-16', '2024-01-17'],
                'DARE': ['', '150.00', ''],
                'AVERE': ['1000.00', '', '75.50'],
                'DESCRIZIONE OPERAZIONE': [
                    'VERSAMENTO DA CLIENTE XYZ SRL',
                    'PAGAMENTO FORNITORE ABC SPA',
                    'COMMISSIONI BANCARIE'
                ],
                'CAUSALE ABI': ['', '103', '']
            }
            
            df = pd.DataFrame(template_data)
            
            # Crea CSV in memoria
            csv_buffer = StringIO()
            df.to_csv(csv_buffer, index=False, sep=';', encoding='utf-8')
            csv_content = csv_buffer.getvalue()
            
            return csv_content.encode('utf-8')
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _create_template)
    
    @staticmethod
    async def validate_invoice_files_async(
        files_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Valida file fatture prima dell'importazione
        """
        def _validate_files():
            valid_files = []
            invalid_files = []
            
            for file_info in files_data:
                filename = file_info['filename']
                content = file_info.get('content', b'')
                content_type = file_info.get('content_type', '')
                
                validation = {
                    'filename': filename,
                    'valid': False,
                    'errors': [],
                    'warnings': []
                }
                
                # Verifica estensione
                _, ext = os.path.splitext(filename)
                ext = ext.lower()
                
                if ext not in ['.xml', '.p7m']:
                    validation['errors'].append(f'Estensione non supportata: {ext}')
                
                # Verifica dimensione
                if len(content) == 0:
                    validation['errors'].append('File vuoto')
                elif len(content) > 50 * 1024 * 1024:  # 50MB
                    validation['errors'].append('File troppo grande (max 50MB)')
                
                # Verifica content type
                valid_content_types = [
                    'application/xml',
                    'text/xml',
                    'application/pkcs7-mime',
                    'application/x-pkcs7-mime'
                ]
                
                if content_type and content_type not in valid_content_types:
                    validation['warnings'].append(f'Content-Type inaspettato: {content_type}')
                
                # Verifica contenuto base
                if content:
                    try:
                        # Per XML, verifica che inizi con <?xml o contenga tag fattura
                        if ext == '.xml':
                            content_str = content.decode('utf-8', errors='ignore')[:1000]
                            if not ('<?xml' in content_str or 'FatturaElettronica' in content_str):
                                validation['warnings'].append('Il contenuto non sembra un XML di fattura elettronica')
                        
                        # Per P7M, verifica che sia un file binario valido
                        elif ext == '.p7m':
                            if content[:4] not in [b'\x30\x82', b'\x30\x80']:
                                validation['warnings'].append('Il file P7M potrebbe non essere valido')
                                
                    except Exception as e:
                        validation['warnings'].append(f'Errore verifica contenuto: {str(e)}')
                
                # Determina se valido
                validation['valid'] = len(validation['errors']) == 0
                
                if validation['valid']:
                    valid_files.append(file_info)
                else:
                    invalid_files.append(validation)
            
            return {
                'total_files': len(files_data),
                'valid_files': len(valid_files),
                'invalid_files': len(invalid_files),
                'validation_results': invalid_files,
                'can_proceed': len(valid_files) > 0
            }
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _validate_files)
    
    @staticmethod
    async def get_import_statistics_async() -> Dict[str, Any]:
        """
        Ottiene statistiche sulle importazioni
        """
        def _get_statistics():
            from app.core.database import get_connection
            from datetime import datetime, timedelta
            
            conn = get_connection()
            try:
                cursor = conn.cursor()
                
                # Statistiche fatture
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_invoices,
                        COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as last_30_days,
                        COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as last_7_days,
                        COUNT(CASE WHEN type = 'Attiva' THEN 1 END) as active_invoices,
                        COUNT(CASE WHEN type = 'Passiva' THEN 1 END) as passive_invoices
                    FROM Invoices
                """)
                
                invoice_stats = cursor.fetchone()
                
                # Statistiche transazioni
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_transactions,
                        COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as last_30_days,
                        COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as last_7_days,
                        SUM(CASE WHEN amount > 0 THEN 1 ELSE 0 END) as positive_transactions,
                        SUM(CASE WHEN amount < 0 THEN 1 ELSE 0 END) as negative_transactions
                    FROM BankTransactions
                """)
                
                transaction_stats = cursor.fetchone()
                
                # Recenti importazioni
                cursor.execute("""
                    SELECT 
                        'invoice' as type,
                        MAX(created_at) as last_import,
                        COUNT(*) as count
                    FROM Invoices 
                    WHERE created_at >= date('now', '-30 days')
                    
                    UNION ALL
                    
                    SELECT 
                        'transaction' as type,
                        MAX(created_at) as last_import,
                        COUNT(*) as count
                    FROM BankTransactions 
                    WHERE created_at >= date('now', '-30 days')
                """)
                
                recent_imports = cursor.fetchall()
                
                return {
                    'invoices': dict(invoice_stats) if invoice_stats else {},
                    'transactions': dict(transaction_stats) if transaction_stats else {},
                    'recent_activity': [dict(row) for row in recent_imports],
                    'last_updated': datetime.now().isoformat()
                }
                
            except Exception as e:
                logger.error(f"Errore getting import statistics: {e}")
                return {
                    'error': str(e),
                    'invoices': {},
                    'transactions': {},
                    'recent_activity': []
                }
            finally:
                conn.close()
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _get_statistics)
    
    @staticmethod
    async def cleanup_temp_files_async() -> Dict[str, Any]:
        """
        Pulizia file temporanei di importazione
        """
        def _cleanup():
            import tempfile
            import glob
            
            cleanup_stats = {
                'files_removed': 0,
                'space_freed_mb': 0,
                'errors': []
            }
            
            try:
                temp_dir = tempfile.gettempdir()
                
                # Pattern file temporanei delle importazioni
                patterns = [
                    os.path.join(temp_dir, "fattura_import_*"),
                    os.path.join(temp_dir, "invoice_import_*"),
                    os.path.join(temp_dir, "*_extract_*.xml"),
                    os.path.join(temp_dir, "*_alt_*.xml")
                ]
                
                for pattern in patterns:
                    for file_path in glob.glob(pattern):
                        try:
                            if os.path.isfile(file_path):
                                # Verifica che sia abbastanza vecchio (>1 ora)
                                if os.path.getmtime(file_path) < (time.time() - 3600):
                                    file_size = os.path.getsize(file_path)
                                    os.unlink(file_path)
                                    cleanup_stats['files_removed'] += 1
                                    cleanup_stats['space_freed_mb'] += file_size / (1024 * 1024)
                            elif os.path.isdir(file_path):
                                # Rimuovi directory temporanee vuote
                                if not os.listdir(file_path):
                                    os.rmdir(file_path)
                                    cleanup_stats['files_removed'] += 1
                        except Exception as e:
                            cleanup_stats['errors'].append(f"Errore rimozione {file_path}: {str(e)}")
                
                cleanup_stats['space_freed_mb'] = round(cleanup_stats['space_freed_mb'], 2)
                
                return cleanup_stats
                
            except Exception as e:
                return {
                    'files_removed': 0,
                    'space_freed_mb': 0,
                    'errors': [f"Errore cleanup: {str(e)}"]
                }
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _cleanup)

# Istanza globale dell'adapter
importer_adapter = ImporterAdapter()
