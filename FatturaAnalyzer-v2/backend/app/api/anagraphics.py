"""
Anagraphics API endpoints - Integrato con core PySide6 esistente
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from fastapi.responses import JSONResponse

# Usa adapter invece di accesso diretto al database
from app.adapters.database_adapter import db_adapter
from app.models import (
    Anagraphics, AnagraphicsCreate, AnagraphicsUpdate, AnagraphicsFilter,
    PaginationParams, AnagraphicsListResponse, APIResponse, ErrorResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=AnagraphicsListResponse)
async def get_anagraphics_list(
    type_filter: Optional[str] = Query(None, description="Filter by type: Cliente or Fornitore"),
    search: Optional[str] = Query(None, description="Search in denomination, piva, cf"),
    city: Optional[str] = Query(None, description="Filter by city"),
    province: Optional[str] = Query(None, description="Filter by province"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=1000, description="Page size")
):
    """Get paginated list of anagraphics with optional filters"""
    try:
        # Usa il core esistente tramite adapter
        df_anagraphics = await db_adapter.get_anagraphics_async(type_filter=type_filter)
        
        if df_anagraphics.empty:
            return AnagraphicsListResponse(
                items=[],
                total=0,
                page=page,
                size=size,
                pages=0
            )
        
        # Applica filtri aggiuntivi
        if search:
            search_mask = (
                df_anagraphics['denomination'].str.contains(search, case=False, na=False) |
                df_anagraphics['piva'].str.contains(search, case=False, na=False) |
                df_anagraphics['cf'].str.contains(search, case=False, na=False)
            )
            df_anagraphics = df_anagraphics[search_mask]
        
        if city:
            df_anagraphics = df_anagraphics[
                df_anagraphics['city'].str.contains(city, case=False, na=False)
            ]
        
        if province:
            df_anagraphics = df_anagraphics[df_anagraphics['province'] == province]
        
        total = len(df_anagraphics)
        
        # Paginazione
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        df_paginated = df_anagraphics.iloc[start_idx:end_idx]
        
        # Converti in formato API
        items = df_paginated.to_dict('records')
        pages = (total + size - 1) // size
        
        return AnagraphicsListResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
        
    except Exception as e:
        logger.error(f"Error getting anagraphics list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving anagraphics: {str(e)}")


@router.get("/{anagraphics_id}", response_model=Anagraphics)
async def get_anagraphics_by_id(
    anagraphics_id: int = Path(..., description="Anagraphics ID")
):
    """Get anagraphics by ID"""
    try:
        # Usa query customizzata tramite adapter
        result = await db_adapter.execute_query_async(
            """
            SELECT id, type, denomination, piva, cf, address, cap, city, province, country,
                   iban, email, phone, pec, codice_destinatario, score, created_at, updated_at
            FROM Anagraphics WHERE id = ?
            """,
            (anagraphics_id,)
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Anagraphics not found")
        
        return result[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting anagraphics {anagraphics_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving anagraphics")


@router.post("/", response_model=Anagraphics)
async def create_anagraphics(anagraphics_data: AnagraphicsCreate):
    """Create new anagraphics"""
    try:
        # Validazione
        if not anagraphics_data.piva and not anagraphics_data.cf:
            raise HTTPException(
                status_code=400, 
                detail="Either VAT number (piva) or Tax Code (cf) must be provided"
            )
        
        # Check duplicati usando adapter
        if anagraphics_data.piva:
            is_duplicate = await db_adapter.check_duplicate_async(
                'Anagraphics', 'piva', anagraphics_data.piva
            )
            if is_duplicate:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Anagraphics with VAT {anagraphics_data.piva} already exists"
                )
        
        # Usa il core per aggiungere anagrafica
        anag_dict = anagraphics_data.model_dump()
        new_id = await db_adapter.add_anagraphics_async(anag_dict, anagraphics_data.type)
        
        if not new_id:
            raise HTTPException(status_code=500, detail="Failed to create anagraphics")
        
        # Restituisci l'anagrafica creata
        return await get_anagraphics_by_id(new_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating anagraphics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating anagraphics")


@router.put("/{anagraphics_id}", response_model=Anagraphics)
async def update_anagraphics(
    anagraphics_id: int = Path(..., description="Anagraphics ID"),
    anagraphics_data: AnagraphicsUpdate = ...
):
    """Update anagraphics"""
    try:
        # Check se esiste
        existing = await db_adapter.execute_query_async(
            "SELECT id FROM Anagraphics WHERE id = ?", (anagraphics_id,)
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Anagraphics not found")
        
        # Build update query dinamica
        update_fields = []
        params = []
        
        for field, value in anagraphics_data.model_dump(exclude_unset=True).items():
            if value is not None:
                update_fields.append(f"{field} = ?")
                params.append(value)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Aggiungi updated_at
        update_fields.append("updated_at = datetime('now')")
        params.append(anagraphics_id)
        
        update_query = f"UPDATE Anagraphics SET {', '.join(update_fields)} WHERE id = ?"
        
        rows_affected = await db_adapter.execute_write_async(update_query, tuple(params))
        
        if rows_affected == 0:
            raise HTTPException(status_code=404, detail="Anagraphics not found")
        
        # Restituisci l'anagrafica aggiornata
        return await get_anagraphics_by_id(anagraphics_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating anagraphics {anagraphics_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating anagraphics")


@router.delete("/{anagraphics_id}", response_model=APIResponse)
async def delete_anagraphics(
    anagraphics_id: int = Path(..., description="Anagraphics ID")
):
    """Delete anagraphics"""
    try:
        # Check se ha fatture associate
        invoices = await db_adapter.execute_query_async(
            "SELECT COUNT(*) as count FROM Invoices WHERE anagraphics_id = ?", 
            (anagraphics_id,)
        )
        
        if invoices and invoices[0]['count'] > 0:
            raise HTTPException(
                status_code=409, 
                detail="Cannot delete anagraphics with associated invoices"
            )
        
        # Elimina
        rows_affected = await db_adapter.execute_write_async(
            "DELETE FROM Anagraphics WHERE id = ?", (anagraphics_id,)
        )
        
        if rows_affected == 0:
            raise HTTPException(status_code=404, detail="Anagraphics not found")
        
        return APIResponse(
            success=True,
            message="Anagraphics deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting anagraphics {anagraphics_id}: {e}", exc_info=True)
        raise