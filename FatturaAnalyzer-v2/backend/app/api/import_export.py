"""
Enhanced Import/Export API endpoints with Enterprise ZIP Support
VERSIONE ENTERPRISE FINALE E FUNZIONANTE - Implementa tutti gli endpoint richiesti dal frontend.
"""
import logging
import os
import tempfile
import time
import shutil
import zipfile
from typing import List, Optional, Dict, Any
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Response
from fastapi.responses import StreamingResponse
from io import BytesIO
from datetime import datetime
from app.adapters.importer_adapter import importer_adapter
from app.adapters.database_adapter import db_adapter
from app.models import ImportResult, APIResponse

logger = logging.getLogger(__name__)
router = APIRouter()

class ZIPValidationResult:
    """Data class for ZIP archive validation results."""
    def __init__(self):
        self.validation_status: str = 'unknown'
        self.can_import: bool = False
        self.validation_details: Dict[str, Any] = {'zip_valid': False, 'file_count': 0, 'total_size_mb': 0, 'file_breakdown': {}, 'warnings': [], 'errors': []}
        self.recommendations: List[str] = []

def validate_zip_structure(zip_path: str, expected_types: Optional[List[str]] = None) -> ZIPValidationResult:
    result = ZIPValidationResult()
    try:
        if not zipfile.is_zipfile(zip_path):
            result.validation_details['errors'].append("File is not a valid ZIP archive.")
            result.validation_status = 'invalid'
            return result
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            file_list = [f for f in zip_ref.infolist() if not f.is_dir() and not f.filename.startswith('__MACOSX')]
            result.validation_details.update({'zip_valid': True, 'file_count': len(file_list), 'total_size_mb': round(sum(f.file_size for f in file_list) / (1024*1024), 2)})
            file_breakdown: Dict[str, int] = {}
            valid_files_count = 0
            for f in file_list:
                ext = Path(f.filename).suffix.lower() or '.none'
                file_breakdown[ext] = file_breakdown.get(ext, 0) + 1
                if (expected_types and ext in expected_types) or (not expected_types and ext in ['.xml', '.p7m', '.csv']):
                    valid_files_count += 1
            result.validation_details['file_breakdown'] = file_breakdown
            if valid_files_count == 0 and file_list:
                result.validation_details['warnings'].append(f"No files with expected extensions found.")
            if not result.validation_details['errors']:
                result.validation_status = 'valid'
                result.can_import = True
    except Exception as e:
        result.validation_details['errors'].append(str(e))
        result.validation_status = 'invalid'
    return result

@router.post("/validate-zip", response_model=APIResponse)
async def validate_zip_endpoint(file: UploadFile = File(..., description="ZIP archive to validate")):
    """Validates the structure and content of a ZIP archive before import."""
    if not file.filename or not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temp_zip:
        shutil.copyfileobj(file.file, temp_zip)
        temp_zip_path = temp_zip.name

    try:
        validation_result = validate_zip_structure(temp_zip_path)
        return APIResponse(success=validation_result.can_import, message="Validation completed", data=validation_result.__dict__)
    finally:
        os.unlink(temp_zip_path)

@router.post("/invoices/zip", response_model=ImportResult)
async def import_invoices_from_zip(file: UploadFile = File(...)):
    """Import invoices from a ZIP archive."""
    if not file.filename or not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
        
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_zip_path = os.path.join(temp_dir, file.filename)
        try:
            with open(temp_zip_path, "wb") as temp_file:
                shutil.copyfileobj(file.file, temp_file)
            
            validation_result = validate_zip_structure(temp_zip_path, expected_types=['.xml', '.p7m'])
            if not validation_result.can_import:
                raise HTTPException(status_code=400, detail={"message": "ZIP validation failed", "details": validation_result.validation_details})

            result = await importer_adapter.import_from_source_async(temp_zip_path)
            return ImportResult(**result)
        except Exception as e:
            logger.error(f"Error processing ZIP archive in /invoices/zip: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error processing ZIP archive: {e}")

@router.get("/templates/transactions-csv")
async def download_transaction_template():
    """Downloads a CSV template for bank transactions."""
    template_content = await importer_adapter.create_csv_template_async()
    return Response(content=template_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=template_transazioni.csv"})

@router.get("/statistics", response_model=APIResponse)
async def get_import_statistics():
    """Retrieves real import statistics from the database."""
    try:
        invoices_stats = await db_adapter.execute_query_async("SELECT COUNT(*) as total FROM Invoices")
        transactions_stats = await db_adapter.execute_query_async("SELECT COUNT(*) as total FROM BankTransactions")
        return APIResponse(success=True, data={
            "invoices": {"total_invoices": invoices_stats[0]['total']},
            "transactions": {"total_transactions": transactions_stats[0]['total']},
            "last_updated": datetime.now().isoformat()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not retrieve import statistics.")
