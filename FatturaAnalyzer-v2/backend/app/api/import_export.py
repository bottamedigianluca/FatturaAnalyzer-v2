"""
Enhanced Import/Export API endpoints with Enterprise ZIP Support
VERSIONE ENTERPRISE COMPLETA E FUNZIONANTE - Implementa tutti gli endpoint richiesti dal frontend.
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
        if not zipfile.is_zipfile(zip_path):
            result.validation_details['errors'].append("File is not a valid ZIP archive.")
            result.validation_status = 'invalid'
            return result

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
                
                all_expected_types = expected_types or ['.xml', '.p7m', '.csv', '.txt']
                if ext in all_expected_types:
                    valid_files_count += 1

            result.validation_details['file_breakdown'] = file_breakdown

            if total_size > 500 * 1024 * 1024:
                result.validation_details['errors'].append(f"Archive size ({result.validation_details['total_size_mb']}MB) exceeds 500MB limit")
            if len(file_list) > 10000:
                result.validation_details['errors'].append(f"Too many files ({len(file_list)}). Maximum 10000 files allowed")

            if valid_files_count == 0 and file_list:
                result.validation_details['warnings'].append(f"No files with expected extensions ({expected_types or 'any'}) found in archive.")
            
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

@router.post("/validate-zip", response_model=APIResponse)
async def validate_zip_endpoint(file: UploadFile = File(..., description="ZIP archive to validate")):
    """Validates the structure and content of a ZIP archive before import."""
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temp_zip:
        shutil.copyfileobj(file.file, temp_zip)
        temp_zip_path = temp_zip.name

    try:
        validation_result = validate_zip_structure(temp_zip_path)
        return APIResponse(
            success=validation_result.can_import,
            message="Validation completed",
            data=validation_result.__dict__
        )
    finally:
        os.unlink(temp_zip_path)

@router.post("/invoices/zip", response_model=ImportResult)
async def import_invoices_from_zip(file: UploadFile = File(...)):
    """Import invoices from a ZIP archive."""
    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a ZIP archive")
        
    with tempfile.TemporaryDirectory() as temp_dir:
        content = await file.read()
        await file.seek(0)
        temp_zip_path = os.path.join(temp_dir, file.filename)
        with open(temp_zip_path, "wb") as temp_file:
            temp_file.write(content)
        
        validation_result = validate_zip_structure(temp_zip_path, expected_types=['.xml', '.p7m'])
        if not validation_result.can_import:
            raise HTTPException(status_code=400, detail={
                "message": "ZIP validation failed",
                "details": validation_result.validation_details
            })

        result = await importer_adapter.import_from_source_async(temp_zip_path)
        return ImportResult(**result)

@router.get("/templates/transactions-csv")
async def download_transaction_template():
    """Downloads a CSV template for bank transactions."""
    template_content = await importer_adapter.create_csv_template_async()
    return Response(content=template_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=template_transazioni.csv"})

# ========== ROBUST ENTERPRISE ENDPOINTS (previously missing) ==========

@router.get("/statistics", response_model=APIResponse)
async def get_import_statistics():
    """Retrieves import statistics from the database."""
    try:
        invoices_stats = await db_adapter.execute_query_async("SELECT COUNT(*) as total, COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as last_30 FROM Invoices")
        transactions_stats = await db_adapter.execute_query_async("SELECT COUNT(*) as total, COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as last_30 FROM BankTransactions")
        last_import = await db_adapter.execute_query_async("SELECT MAX(created_at) as last_ts FROM Invoices UNION SELECT MAX(created_at) FROM BankTransactions ORDER BY last_ts DESC LIMIT 1")
        
        stats = {
            "invoices": {"total_invoices": invoices_stats[0]['total'], "last_30_days": invoices_stats[0]['last_30']},
            "transactions": {"total_transactions": transactions_stats[0]['total'], "last_30_days": transactions_stats[0]['last_30']},
            "last_updated": last_import[0]['last_ts'] if last_import and last_import[0]['last_ts'] else None
        }
        return APIResponse(success=True, data=stats)
    except Exception as e:
        logger.error(f"Failed to get import statistics: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve import statistics.")

@router.get("/health/enterprise", response_model=APIResponse)
async def get_import_health():
    """Checks the health of the import/export subsystem."""
    health_status = {"status": "healthy", "import_adapter": "operational", "temp_storage": "operational", "issues": []}
    try:
        if not os.path.exists('temp'):
            os.makedirs('temp')
        with tempfile.NamedTemporaryFile(dir='temp') as tempf:
            tempf.write(b'health_check')
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["temp_storage"] = "critical"
        health_status["issues"].append(f"Temp storage not writable: {e}")

    # A more advanced check could test importer adapter dependencies
    # For now, we assume it's operational if the code loads
    
    return APIResponse(success=True, data=health_status)

@router.get("/supported-formats/enterprise", response_model=APIResponse)
async def get_supported_formats():
    """Returns the currently supported file formats and enterprise features."""
    data = {
        "import_formats": {
            "invoices": ["xml", "p7m", "zip"], 
            "transactions": ["csv", "zip"],
            "mixed": ["zip"]
        },
        "enterprise_features": [
            "batch_zip_import", 
            "auto_validation", 
            "background_processing"
        ],
        "limits_and_constraints": {
            "max_zip_size_mb": 500, 
            "max_files_per_zip": 10000,
            "max_single_file_size_mb": 50
        }
    }
    return APIResponse(success=True, data=data)

@router.get("/export/presets", response_model=APIResponse)
async def get_export_presets():
    """Returns a list of predefined export configurations."""
    # In a real app, this would come from a database or config file
    presets = [
        {"id": "monthly_financial_summary", "name": "Riepilogo Finanziario Mensile", "entity": "invoices", "format": "excel"},
        {"id": "yearly_client_report", "name": "Report Clienti Annuale", "entity": "anagraphics", "format": "pdf"},
        {"id": "unreconciled_transactions", "name": "Transazioni non Riconciliate", "entity": "transactions", "format": "csv"}
    ]
    return APIResponse(success=True, data=presets)
