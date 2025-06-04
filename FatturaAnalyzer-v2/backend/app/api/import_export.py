"""
Import/Export API endpoints - Aggiornato per usare adapter pattern
"""

import logging
import os
import tempfile
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from io import BytesIO
import pandas as pd

# Usa adapters invece di accesso diretto al core
from app.adapters.database_adapter import db_adapter
from app.adapters.importer_adapter import importer_adapter
from app.models import ImportResult, FileUploadResponse, APIResponse
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/invoices/xml", response_model=ImportResult)
async def import_invoices_xml(
    files: List[UploadFile] = File(..., description="XML or P7M invoice files"),
    background_tasks: BackgroundTasks = None
):
    """Import invoices from XML or P7M files using core adapter"""
    try:
        if len(files) > 50:
            raise HTTPException(status_code=400, detail="Maximum 50 files allowed per upload")
        
        # Validazione tipi file
        allowed_extensions = ['.xml', '.p7m']
        for file in files:
            if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
                raise HTTPException(
                    status_code=400, 
                    detail=f"File {file.filename} has unsupported format. Only XML and P7M files are allowed."
                )
        
        # Crea directory temporanea
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_files = []
            
            # Salva file caricati
            for file in files:
                temp_path = os.path.join(temp_dir, file.filename)
                with open(temp_path, "wb") as temp_file:
                    content = await file.read()
                    temp_file.write(content)
                temp_files.append(temp_path)
            
            # Valida file prima dell'importazione
            validation_results = []
            for temp_path in temp_files:
                validation = await importer_adapter.validate_file_async(temp_path)
                validation_results.append({
                    'path': temp_path,
                    'filename': os.path.basename(temp_path),
                    'validation': validation
                })
            
            # Filtra solo file validi
            valid_files = [
                result['path'] for result in validation_results 
                if result['validation']['valid']
            ]
            
            invalid_files = [
                result for result in validation_results 
                if not result['validation']['valid']
            ]
            
            if not valid_files:
                error_details = []
                for invalid in invalid_files:
                    error_details.append(f"{invalid['filename']}: {', '.join(invalid['validation']['errors'])}")
                
                raise HTTPException(
                    status_code=400, 
                    detail=f"No valid files to import. Errors: {'; '.join(error_details)}"
                )
            
            # Callback per progress tracking
            def progress_callback(current, total):
                logger.info(f"Processing file {current}/{total}")
            
            # Importa file usando adapter
            try:
                result = await importer_adapter.import_multiple_files_async(
                    valid_files, 
                    progress_callback
                )
                
                # Aggiungi informazioni sui file non validi
                for invalid in invalid_files:
                    result['processed'] += 1
                    result['errors'] += 1
                    result['files'].append({
                        'name': invalid['filename'],
                        'status': f"Validation failed: {', '.join(invalid['validation']['errors'])}"
                    })
                
                return ImportResult(**result)
                
            except Exception as import_error:
                logger.error(f"Import error: {import_error}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Import failed: {str(import_error)}"
                )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing XML/P7M files: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error importing files")


@router.post("/invoices/zip", response_model=ImportResult)
async def import_invoices_zip(
    file: UploadFile = File(..., description="ZIP file containing XML/P7M invoices")
):
    """Import invoices from ZIP archive using core adapter"""
    try:
        if not file.filename.lower().endswith('.zip'):
            raise HTTPException(status_code=400, detail="File must be a ZIP archive")
        
        # Crea file temporaneo per ZIP
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as temp_zip:
            content = await file.read()
            temp_zip.write(content)
            temp_zip_path = temp_zip.name
        
        try:
            # Valida ZIP
            validation = await importer_adapter.validate_file_async(temp_zip_path)
            if not validation['valid']:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid ZIP file: {', '.join(validation['errors'])}"
                )
            
            # Callback per progress
            def progress_callback(current, total):
                logger.info(f"Processing file {current}/{total} from ZIP")
            
            # Importa usando adapter
            result = await importer_adapter.extract_and_import_zip_async(
                temp_zip_path, 
                progress_callback
            )
            
            return ImportResult(**result)
            
        finally:
            # Pulizia file temporaneo
            try:
                os.unlink(temp_zip_path)
            except:
                pass
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing ZIP file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error importing ZIP file")


@router.post("/transactions/csv", response_model=ImportResult)
async def import_transactions_csv(
    file: UploadFile = File(..., description="CSV file with bank transactions")
):
    """Import bank transactions from CSV file using core adapter"""
    try:
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        # Leggi contenuto file
        content = await file.read()
        
        # Try decodifica con diversi encoding
        try:
            content_str = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                content_str = content.decode('latin-1')
            except UnicodeDecodeError:
                content_str = content.decode('cp1252')
        
        # Importa usando adapter
        result = await importer_adapter.import_csv_transactions_async(
            content_str, 
            file.filename
        )
        
        return ImportResult(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing CSV transactions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error importing CSV file")


@router.get("/templates/transactions-csv")
async def download_transactions_csv_template():
    """Download CSV template for bank transactions import"""
    try:
        # Crea template CSV
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
        
        # Crea CSV in memory
        csv_buffer = BytesIO()
        csv_content = df.to_csv(index=False, sep=';', encoding='utf-8')
        csv_buffer.write(csv_content.encode('utf-8'))
        csv_buffer.seek(0)
        
        return StreamingResponse(
            BytesIO(csv_buffer.getvalue()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=template_transazioni_bancarie.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error creating CSV template: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating template")


@router.post("/validate-file", response_model=APIResponse)
async def validate_file(
    file: UploadFile = File(..., description="File to validate")
):
    """Validate file before import"""
    try:
        # Salva file temporaneo
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Valida usando adapter
            validation = await importer_adapter.validate_file_async(temp_path)
            
            return APIResponse(
                success=validation['valid'],
                message="File validation completed",
                data={
                    'filename': file.filename,
                    'validation': validation
                }
            )
            
        finally:
            # Pulizia
            try:
                os.unlink(temp_path)
            except:
                pass
        
    except Exception as e:
        logger.error(f"Error validating file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error validating file")


@router.get("/export/invoices")
async def export_invoices(
    format: str = Query("excel", description="Export format: excel, csv, json"),
    invoice_type: Optional[str] = Query(None, description="Filter by type: Attiva, Passiva"),
    status_filter: Optional[str] = Query(None, description="Filter by payment status"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    include_lines: bool = Query(False, description="Include invoice lines"),
    include_vat: bool = Query(False, description="Include VAT summary")
):
    """Export invoices to various formats using database adapter"""
    try:
        # Ottieni fatture usando adapter
        df_invoices = await db_adapter.get_invoices_async(
            type_filter=invoice_type,
            status_filter=status_filter,
            limit=10000  # Limite alto per export
        )
        
        if df_invoices.empty:
            raise HTTPException(status_code=404, detail="No invoices found with specified filters")
        
        # Applica filtri data se forniti
        if start_date:
            df_invoices = df_invoices[df_invoices['doc_date'] >= start_date]
        if end_date:
            df_invoices = df_invoices[df_invoices['doc_date'] <= end_date]
        
        # Prepara dati export
        export_columns = [
            'id', 'type', 'doc_number', 'doc_date', 'total_amount', 'due_date',
            'payment_status', 'paid_amount', 'counterparty_name'
        ]
        
        # Verifica colonne disponibili
        available_columns = [col for col in export_columns if col in df_invoices.columns]
        export_data = df_invoices[available_columns].copy()
        
        # Rinomina colonne per export
        column_mapping = {
            'id': 'ID',
            'type': 'Tipo',
            'doc_number': 'Numero Doc',
            'doc_date': 'Data Doc',
            'total_amount': 'Importo Totale',
            'due_date': 'Scadenza',
            'payment_status': 'Stato Pagamento',
            'paid_amount': 'Importo Pagato',
            'counterparty_name': 'Controparte'
        }
        
        export_data = export_data.rename(columns=column_mapping)
        
        # Calcola residuo se possibile
        if 'Importo Totale' in export_data.columns and 'Importo Pagato' in export_data.columns:
            export_data['Residuo'] = export_data['Importo Totale'] - export_data['Importo Pagato']
        
        if format == "excel":
            # Crea Excel file
            excel_buffer = BytesIO()
            
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                export_data.to_excel(writer, sheet_name='Fatture', index=False)
                
                # TODO: Aggiungi righe fatture e riepiloghi IVA se richiesto
                # Questo richiederebbe query aggiuntive via adapter
            
            excel_buffer.seek(0)
            
            return StreamingResponse(
                BytesIO(excel_buffer.getvalue()),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=movimenti_export.xlsx"}
            )
            
        elif format == "csv":
            csv_content = export_data.to_csv(index=False, sep=';', encoding='utf-8')
            csv_buffer = BytesIO(csv_content.encode('utf-8'))
            
            return StreamingResponse(
                csv_buffer,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=movimenti_export.csv"}
            )
            
        elif format == "json":
            json_data = export_data.to_dict('records')
            
            return APIResponse(
                success=True,
                message=f"Exported {len(json_data)} transactions",
                data={
                    'transactions': json_data,
                    'count': len(json_data),
                    'filters_applied': {
                        'status': status_filter,
                        'start_date': start_date,
                        'end_date': end_date
                    }
                }
            )
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting transactions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error exporting transactions")


@router.get("/export/anagraphics")
async def export_anagraphics(
    format: str = Query("excel", description="Export format: excel, csv, json"),
    type_filter: Optional[str] = Query(None, description="Filter by type: Cliente, Fornitore"),
    include_stats: bool = Query(False, description="Include financial statistics")
):
    """Export anagraphics to various formats using database adapter"""
    try:
        # Ottieni anagrafiche usando adapter
        df_anagraphics = await db_adapter.get_anagraphics_async(type_filter=type_filter)
        
        if df_anagraphics.empty:
            raise HTTPException(status_code=404, detail="No anagraphics found")
        
        # Prepara dati export
        export_columns = [
            'id', 'type', 'denomination', 'piva', 'cf', 'city', 'province',
            'email', 'phone', 'score'
        ]
        
        available_columns = [col for col in export_columns if col in df_anagraphics.columns]
        export_data = df_anagraphics[available_columns].copy()
        
        # Rinomina colonne
        column_mapping = {
            'id': 'ID',
            'type': 'Tipo',
            'denomination': 'Denominazione',
            'piva': 'P.IVA',
            'cf': 'Codice Fiscale',
            'city': 'Città',
            'province': 'Provincia',
            'email': 'Email',
            'phone': 'Telefono',
            'score': 'Score'
        }
        
        export_data = export_data.rename(columns=column_mapping)
        
        if format == "excel":
            excel_buffer = BytesIO()
            
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                export_data.to_excel(writer, sheet_name='Anagrafiche', index=False)
                
                # Aggiungi statistiche se richiesto
                if include_stats:
                    stats_data = await db_adapter.execute_query_async("""
                        SELECT 
                            a.id,
                            a.denomination,
                            COUNT(i.id) as total_invoices,
                            COALESCE(SUM(i.total_amount), 0) as total_revenue,
                            COALESCE(AVG(i.total_amount), 0) as avg_invoice_amount,
                            MAX(i.doc_date) as last_invoice_date
                        FROM Anagraphics a
                        LEFT JOIN Invoices i ON a.id = i.anagraphics_id
                        WHERE a.type = 'Cliente'
                        GROUP BY a.id, a.denomination
                        ORDER BY total_revenue DESC
                    """)
                    
                    if stats_data:
                        stats_df = pd.DataFrame(stats_data)
                        stats_df.columns = [
                            'ID', 'Denominazione', 'Fatture Totali', 
                            'Fatturato Totale', 'Importo Medio', 'Ultima Fattura'
                        ]
                        stats_df.to_excel(writer, sheet_name='Statistiche', index=False)
            
            excel_buffer.seek(0)
            
            return StreamingResponse(
                BytesIO(excel_buffer.getvalue()),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=anagrafiche_export.xlsx"}
            )
            
        elif format == "csv":
            csv_content = export_data.to_csv(index=False, sep=';', encoding='utf-8')
            csv_buffer = BytesIO(csv_content.encode('utf-8'))
            
            return StreamingResponse(
                csv_buffer,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=anagrafiche_export.csv"}
            )
            
        elif format == "json":
            json_data = export_data.to_dict('records')
            
            return APIResponse(
                success=True,
                message=f"Exported {len(json_data)} anagraphics",
                data={
                    'anagraphics': json_data,
                    'count': len(json_data),
                    'type_filter': type_filter
                }
            )
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting anagraphics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error exporting anagraphics")


@router.get("/export/reconciliation-report")
async def export_reconciliation_report(
    format: str = Query("excel", description="Export format: excel, csv, json"),
    period_months: int = Query(12, ge=1, le=60, description="Period in months"),
    include_unmatched: bool = Query(True, description="Include unmatched items")
):
    """Export comprehensive reconciliation report using database adapter"""
    try:
        # Ottieni link riconciliazione
        recon_links = await db_adapter.execute_query_async("""
            SELECT 
                rl.id as link_id,
                rl.reconciled_amount,
                rl.reconciliation_date,
                i.id as invoice_id,
                i.doc_number,
                i.doc_date,
                i.type as invoice_type,
                i.total_amount as invoice_amount,
                bt.id as transaction_id,
                bt.transaction_date,
                bt.amount as transaction_amount,
                bt.description,
                a.denomination as counterparty
            FROM ReconciliationLinks rl
            JOIN Invoices i ON rl.invoice_id = i.id
            JOIN BankTransactions bt ON rl.transaction_id = bt.id
            JOIN Anagraphics a ON i.anagraphics_id = a.id
            WHERE rl.reconciliation_date >= date('now', '-{} months')
            ORDER BY rl.reconciliation_date DESC
        """.format(period_months))
        
        unmatched_invoices = []
        unmatched_transactions = []
        
        if include_unmatched:
            # Ottieni fatture non riconciliate
            unmatched_invoices = await db_adapter.execute_query_async("""
                SELECT 
                    i.id, i.doc_number, i.doc_date, i.type, i.total_amount,
                    i.payment_status, (i.total_amount - i.paid_amount) as open_amount,
                    a.denomination
                FROM Invoices i
                JOIN Anagraphics a ON i.anagraphics_id = a.id
                WHERE i.payment_status IN ('Aperta', 'Scaduta', 'Pagata Parz.')
                  AND i.doc_date >= date('now', '-{} months')
                ORDER BY i.doc_date DESC
            """.format(period_months))
            
            # Ottieni transazioni non riconciliate
            unmatched_transactions = await db_adapter.execute_query_async("""
                SELECT 
                    id, transaction_date, amount, description, reconciliation_status,
                    (amount - reconciled_amount) as open_amount
                FROM BankTransactions
                WHERE reconciliation_status IN ('Da Riconciliare', 'Riconciliato Parz.')
                  AND transaction_date >= date('now', '-{} months')
                ORDER BY transaction_date DESC
            """.format(period_months))
        
        # Crea struttura report
        report_data = {
            'reconciled_items': recon_links,
            'unmatched_invoices': unmatched_invoices,
            'unmatched_transactions': unmatched_transactions,
            'summary': {
                'period_months': period_months,
                'total_reconciled_amount': sum(item.get('reconciled_amount', 0) for item in recon_links),
                'total_links': len(recon_links),
                'unmatched_invoices_count': len(unmatched_invoices),
                'unmatched_transactions_count': len(unmatched_transactions)
            }
        }
        
        if format == "json":
            return APIResponse(
                success=True,
                message="Reconciliation report generated",
                data=report_data
            )
            
        elif format == "excel":
            excel_buffer = BytesIO()
            
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                # Sheet riconciliazioni
                if recon_links:
                    df_recon = pd.DataFrame(recon_links)
                    df_recon.to_excel(writer, sheet_name='Riconciliazioni', index=False)
                
                # Sheet fatture non riconciliate
                if unmatched_invoices:
                    df_unmatched_inv = pd.DataFrame(unmatched_invoices)
                    df_unmatched_inv.to_excel(writer, sheet_name='Fatture Non Riconciliate', index=False)
                
                # Sheet transazioni non riconciliate
                if unmatched_transactions:
                    df_unmatched_trans = pd.DataFrame(unmatched_transactions)
                    df_unmatched_trans.to_excel(writer, sheet_name='Transazioni Non Riconciliate', index=False)
                
                # Sheet riepilogo
                summary_df = pd.DataFrame([report_data['summary']])
                summary_df.to_excel(writer, sheet_name='Riepilogo', index=False)
            
            excel_buffer.seek(0)
            
            return StreamingResponse(
                BytesIO(excel_buffer.getvalue()),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=report_riconciliazione.xlsx"}
            )
            
        elif format == "csv":
            # CSV semplificato con solo riconciliazioni
            if recon_links:
                df_recon = pd.DataFrame(recon_links)
                csv_content = df_recon.to_csv(index=False, sep=';', encoding='utf-8')
            else:
                csv_content = "No reconciliation data available\n"
            
            csv_buffer = BytesIO(csv_content.encode('utf-8'))
            
            return StreamingResponse(
                csv_buffer,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=report_riconciliazione.csv"}
            )
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting reconciliation report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error exporting reconciliation report")


@router.post("/backup/create")
async def create_backup():
    """Create a backup of the database and files using core configuration"""
    try:
        import shutil
        from datetime import datetime
        from pathlib import Path
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"fattura_analyzer_backup_{timestamp}"
        
        # Crea directory temporanea per backup
        with tempfile.TemporaryDirectory() as temp_dir:
            backup_dir = os.path.join(temp_dir, backup_name)
            os.makedirs(backup_dir)
            
            # Copia database usando path da settings
            db_path = settings.get_database_path()
            if os.path.exists(db_path):
                shutil.copy2(db_path, os.path.join(backup_dir, "database.db"))
                logger.info(f"Database copied from {db_path}")
            
            # Copia config se esiste
            config_paths = ["config.ini", "../config.ini", "../../config.ini"]
            for config_path in config_paths:
                if os.path.exists(config_path):
                    shutil.copy2(config_path, backup_dir)
                    logger.info(f"Config copied from {config_path}")
                    break
            
            # Copia file credentials se esistono
            credentials_files = [
                settings.GOOGLE_CREDENTIALS_FILE,
                "google_token.json"
            ]
            for cred_file in credentials_files:
                if os.path.exists(cred_file):
                    shutil.copy2(cred_file, backup_dir)
                    logger.info(f"Credentials file copied: {cred_file}")
            
            # Crea archivio ZIP
            zip_path = os.path.join(temp_dir, f"{backup_name}.zip")
            shutil.make_archive(zip_path[:-4], 'zip', backup_dir)
            
            # Verifica dimensione backup
            backup_size = os.path.getsize(zip_path)
            logger.info(f"Backup created: {backup_size} bytes")
            
            # Restituisci file backup
            return FileResponse(
                zip_path,
                media_type="application/zip",
                filename=f"{backup_name}.zip",
                headers={"Content-Disposition": f"attachment; filename={backup_name}.zip"}
            )
        
    except Exception as e:
        logger.error(f"Error creating backup: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating backup")


@router.get("/status/import-history")
async def get_import_history(
    limit: int = Query(50, ge=1, le=200, description="Number of recent imports to show")
):
    """Get import history and statistics using database adapter"""
    try:
        # Ottieni statistiche usando adapter
        invoice_stats = await db_adapter.execute_query_async("""
            SELECT 
                COUNT(*) as total_invoices,
                COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as invoices_last_30_days,
                COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as invoices_last_7_days
            FROM Invoices
        """)
        
        transaction_stats = await db_adapter.execute_query_async("""
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as transactions_last_30_days,
                COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as transactions_last_7_days
            FROM BankTransactions
        """)
        
        # Combina statistiche
        invoice_data = invoice_stats[0] if invoice_stats else {}
        transaction_data = transaction_stats[0] if transaction_stats else {}
        
        import_stats = {
            "total_invoices": invoice_data.get('total_invoices', 0),
            "total_transactions": transaction_data.get('total_transactions', 0),
            "last_30_days": {
                "invoices": invoice_data.get('invoices_last_30_days', 0),
                "transactions": transaction_data.get('transactions_last_30_days', 0)
            },
            "last_7_days": {
                "invoices": invoice_data.get('invoices_last_7_days', 0),
                "transactions": transaction_data.get('transactions_last_7_days', 0)
            }
        }
        
        # Per ora, storia import fittizia (in futuro si potrebbe implementare una tabella dedicata)
        import_history = []
        
        # Cerca fatture recenti come proxy per import
        recent_invoices = await db_adapter.execute_query_async("""
            SELECT 
                'XML/P7M Import' as type,
                created_at as timestamp,
                COUNT(*) as files_success,
                0 as files_errors
            FROM Invoices 
            WHERE created_at >= date('now', '-30 days')
            GROUP BY date(created_at)
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit // 2,))
        
        # Cerca transazioni recenti come proxy per import CSV
        recent_transactions = await db_adapter.execute_query_async("""
            SELECT 
                'CSV Transactions' as type,
                created_at as timestamp,
                1 as files_success,
                0 as files_errors
            FROM BankTransactions 
            WHERE created_at >= date('now', '-30 days')
            GROUP BY date(created_at)
            ORDER BY created_at DESC
            LIMIT ?
        """, (limit // 2,))
        
        # Combina e formatta history
        all_imports = recent_invoices + recent_transactions
        for i, import_item in enumerate(all_imports[:limit]):
            import_history.append({
                "id": i + 1,
                "timestamp": import_item['timestamp'],
                "type": import_item['type'],
                "files_processed": import_item['files_success'],
                "files_success": import_item['files_success'],
                "files_duplicates": 0,
                "files_errors": import_item['files_errors'],
                "status": "completed"
            })
        
        return APIResponse(
            success=True,
            message="Import history retrieved",
            data={
                "import_history": import_history,
                "statistics": import_stats
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting import history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving import history"); filename=fatture_export.xlsx"}
            )
            
        elif format == "csv":
            # Crea CSV
            csv_content = export_data.to_csv(index=False, sep=';', encoding='utf-8')
            csv_buffer = BytesIO(csv_content.encode('utf-8'))
            
            return StreamingResponse(
                csv_buffer,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=fatture_export.csv"}
            )
            
        elif format == "json":
            # Crea JSON
            json_data = export_data.to_dict('records')
            
            return APIResponse(
                success=True,
                message=f"Exported {len(json_data)} invoices",
                data={
                    'invoices': json_data,
                    'count': len(json_data),
                    'filters_applied': {
                        'type': invoice_type,
                        'status': status_filter,
                        'start_date': start_date,
                        'end_date': end_date
                    }
                }
            )
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting invoices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error exporting invoices")


@router.get("/export/transactions")
async def export_transactions(
    format: str = Query("excel", description="Export format: excel, csv, json"),
    status_filter: Optional[str] = Query(None, description="Filter by reconciliation status"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    include_reconciliation: bool = Query(False, description="Include reconciliation details")
):
    """Export bank transactions to various formats using database adapter"""
    try:
        # Ottieni transazioni usando adapter
        df_transactions = await db_adapter.get_transactions_async(
            start_date=start_date,
            end_date=end_date,
            status_filter=status_filter,
            limit=10000
        )
        
        if df_transactions.empty:
            raise HTTPException(status_code=404, detail="No transactions found with specified filters")
        
        # Prepara dati export
        export_columns = [
            'id', 'transaction_date', 'value_date', 'amount',
            'description', 'causale_abi', 'reconciliation_status'
        ]
        
        available_columns = [col for col in export_columns if col in df_transactions.columns]
        export_data = df_transactions[available_columns].copy()
        
        # Rinomina colonne
        column_mapping = {
            'id': 'ID',
            'transaction_date': 'Data Operazione',
            'value_date': 'Data Valuta',
            'amount': 'Importo',
            'description': 'Descrizione',
            'causale_abi': 'Causale ABI',
            'reconciliation_status': 'Stato Riconciliazione'
        }
        
        export_data = export_data.rename(columns=column_mapping)
        
        if format == "excel":
            excel_buffer = BytesIO()
            
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                export_data.to_excel(writer, sheet_name='Movimenti', index=False)
                
                # TODO: Aggiungi dettagli riconciliazione se richiesto
            
            excel_buffer.seek(0)
            
            return StreamingResponse(
                BytesIO(excel_buffer.getvalue()),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment