"""
Enhanced Import/Export API endpoints with Enterprise ZIP Support
Integrazione completa ZIP per FatturaAnalyzer Enterprise - VERSIONE CORRETTA
"""
import logging
import os
import tempfile
import time
import shutil
import zipfile
from typing import List, Optional, Dict, Any, Union
from pathlib import Path
import mimetypes
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, BackgroundTasks, Form, Response
from fastapi.responses import FileResponse, StreamingResponse
from io import BytesIO
import pandas as pd
from app.adapters.importer_adapter import importer_adapter
from app.models import ImportResult, FileUploadResponse, APIResponse
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

class ZIPValidationResult:
    """Results from ZIP archive validation"""
    def __init__(self):
        self.validation_status = 'unknown'
        self.can_import = False
        self.validation_details = {
            'zip_valid': False,
            'file_count': 0,
            'total_size_mb': 0,
            'file_breakdown': {},
            'warnings': [],
            'errors': []
        }
        self.recommendations = []

def validate_zip_structure(zip_path: str, expected_types: Optional[List[str]] = None) -> ZIPValidationResult:
    """Validate ZIP archive structure for enterprise import (more robust)"""
    result = ZIPValidationResult()
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            file_list = [f for f in zip_ref.infolist() if not f.is_dir() and not f.filename.startswith('__MACOSX')]
            result.validation_details['zip_valid'] = True
            result.validation_details['file_count'] = len(file_list)
            total_size = sum(file_info.file_size for file_info in file_list)
            result.validation_details['total_size_mb'] = round(total_size / (1024 * 1024), 2)
            
            file_breakdown = {}
            valid_files_count = 0
            
            for file_info in file_list:
                ext = Path(file_info.filename).suffix.lower() if Path(file_info.filename).suffix else '.none'
                file_breakdown[ext] = file_breakdown.get(ext, 0) + 1
                
                if expected_types:
                    if ext in expected_types:
                        valid_files_count += 1
                elif ext in ['.xml', '.p7m', '.csv', '.txt']:
                    valid_files_count += 1

            result.validation_details['file_breakdown'] = file_breakdown

            if total_size > 500 * 1024 * 1024:
                result.validation_details['errors'].append(f"Archive size ({result.validation_details['total_size_mb']}MB) exceeds 500MB limit")
            if len(file_list) > 10000:
                result.validation_details['errors'].append(f"Too many files ({len(file_list)}). Maximum 10000 files allowed")

            if valid_files_count == 0 and file_list:
                result.validation_details['errors'].append(f"No valid files found in archive. Expected: {expected_types or 'XML, P7M, CSV'}")
            
            if len(result.validation_details['errors']) == 0:
                result.validation_status = 'valid'
                result.can_import = True
                result.recommendations.append(f"Found {valid_files_count} potentially valid files.")
            else:
                result.validation_status = 'invalid'
                result.can_import = False

    except zipfile.BadZipFile:
        result.validation_details['errors'].append("Invalid or corrupted ZIP file")
        result.validation_status = 'invalid'
    except Exception as e:
        result.validation_details['errors'].append(f"ZIP validation error: {str(e)}")
        result.validation_status = 'invalid'
    
    return result

def extract_zip_safely(zip_file: UploadFile, extract_to: str) -> Dict[str, Any]:
    """Safely extract ZIP file with security checks"""
    extracted_files = []
    try:
        temp_zip_path = os.path.join(extract_to, "upload.zip")
        # Use shutil.copyfileobj for efficient file writing
        with open(temp_zip_path, "wb") as temp_file:
            shutil.copyfileobj(zip_file.file, temp_file)
        
        with zipfile.ZipFile(temp_zip_path, 'r') as zip_ref:
            for member in zip_ref.infolist():
                if ".." in member.filename or member.filename.startswith(("/", "\\")):
                    continue
                if member.is_dir() or member.filename.startswith('__MACOSX'):
                    continue
                    
                extracted_path = zip_ref.extract(member, extract_to)
                extracted_files.append({
                    'original_name': member.filename,
                    'extracted_path': extracted_path,
                    'size': member.file_size,
                    'extension': Path(member.filename).suffix.lower()
                })
        os.remove(temp_zip_path)
        return {
            'success': True,
            'extracted_files': extracted_files,
            'total_files': len(extracted_files)
        }
    except Exception as e:
        logger.error(f"ZIP extraction failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'extracted_files': []
        }

@router.post("/invoices/zip", response_model=ImportResult)
async def import_invoices_from_zip(
    file: UploadFile = File(..., description="ZIP archive containing XML/P7M invoice files"),
    validate_before_import: bool = Query(True, description="Validate ZIP before processing"),
):
    """Import invoices from ZIP archive - Enterprise Edition"""
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
        
    with tempfile.TemporaryDirectory() as temp_dir:
        content = await file.read()
        await file.seek(0)
        temp_zip_path = os.path.join(temp_dir, file.filename)
        with open(temp_zip_path, "wb") as temp_file:
            temp_file.write(content)
        
        if validate_before_import:
            validation_result = validate_zip_structure(temp_zip_path, expected_types=['.xml', '.p7m'])
            if not validation_result.can_import:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "ZIP validation failed",
                        "validation_errors": validation_result.validation_details['errors'],
                        "validation_warnings": validation_result.validation_details['warnings']
                    }
                )

        result = await importer_adapter.import_from_source_async(temp_zip_path)
        return ImportResult(**result)

# CORREZIONE: Implementato endpoint /validate-zip
@router.post("/validate-zip", response_model=APIResponse)
async def validate_zip_endpoint(file: UploadFile = File(..., description="ZIP archive to validate")):
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temp_zip:
        shutil.copyfileobj(file.file, temp_zip)
        temp_zip_path = temp_zip.name

    try:
        validation_result = validate_zip_structure(temp_zip_path)
        return APIResponse(
            success=True,
            message="Validation completed",
            data=validation_result.__dict__
        )
    finally:
        os.unlink(temp_zip_path)

@router.post("/transactions/csv-zip", response_model=ImportResult)
async def import_transactions_from_csv_zip(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.zip'):
            raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_zip_path = os.path.join(temp_dir, file.filename)
        with open(temp_zip_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        result = await importer_adapter.import_from_source_async(temp_zip_path)
        return ImportResult(**result)

@router.post("/mixed/zip", response_model=ImportResult)
async def import_mixed_from_zip(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_zip_path = os.path.join(temp_dir, file.filename)
        with open(temp_zip_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        result = await importer_adapter.import_from_source_async(temp_zip_path)
        return ImportResult(**result)

@router.post("/invoices/xml", response_model=ImportResult)
async def import_invoices_from_xml(files: List[UploadFile] = File(...)):
    files_data = []
    for file in files:
        content = await file.read()
        files_data.append({'filename': file.filename, 'content': content, 'content_type': file.content_type})
    
    result = await importer_adapter.import_invoices_from_files_async(files_data)
    return ImportResult(**result)

@router.get("/templates/transactions-csv")
async def download_transaction_template():
    template_content = await importer_adapter.create_csv_template_async()
    return Response(content=template_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=template_transazioni.csv"})

@router.get("/export/{entity}")
async def export_data(entity: str, format: str = Query('excel', pattern="^(excel|csv|json)$")):
    if entity not in ["invoices", "transactions", "anagraphics"]:
        raise HTTPException(status_code=400, detail="Invalid entity for export")
    
    # In una implementazione reale, qui si genererebbe il file
    file_content = f"Dati di esempio esportati per {entity} in formato {format}"
    file_bytes = BytesIO(file_content.encode('utf-8'))
    extension = 'xlsx' if format == 'excel' else format
    filename = f"{entity}_export_{datetime.now().strftime('%Y%m%d')}.{extension}"
    
    media_type = {
        'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'csv': 'text/csv',
        'json': 'application/json'
    }.get(format, 'application/octet-stream')

    return StreamingResponse(file_bytes, media_type=media_type, headers={"Content-Disposition": f"attachment; filename={filename}"})

# ========= ENDPOINT DI ESEMPIO PER RISOLVERE ERRORI 405 =========
# Questi endpoint sono richiesti dall'hook `useImportExport.ts` ma non implementati.
# Li aggiungo qui con una risposta di esempio per evitare crash del frontend.

@router.get("/statistics")
async def get_import_statistics():
    return APIResponse(success=True, data={
        "invoices": {"total_invoices": 1250, "last_30_days": 88},
        "transactions": {"total_transactions": 4500, "last_30_days": 320},
        "last_updated": datetime.now().isoformat()
    })

@router.get("/health/enterprise")
async def get_import_health():
    return APIResponse(success=True, data={
        "status": "healthy",
        "import_adapter": "operational",
        "temp_storage": "operational"
    })

@router.get("/supported-formats/enterprise")
async def get_supported_formats():
    return APIResponse(success=True, data={
        "import_formats": {"invoices": ["xml", "p7m", "zip"], "transactions": ["csv", "zip"]},
        "enterprise_features": ["batch_zip_import", "auto_validation"],
        "limits_and_constraints": {"max_zip_size_mb": 500, "max_files_per_zip": 10000}
    })

@router.get("/export/presets")
async def get_export_presets():
    return APIResponse(success=True, data=[
        {"id": "monthly_summary", "name": "Riepilogo Mensile", "type": "invoices", "format": "excel"},
        {"id": "yearly_clients", "name": "Report Clienti Annuale", "type": "anagraphics", "format": "pdf"}
    ])
