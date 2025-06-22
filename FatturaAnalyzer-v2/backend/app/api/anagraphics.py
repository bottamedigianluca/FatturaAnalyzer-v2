"""
Anagraphics API endpoints - VERSIONE ENTERPRISE FINALE E FUNZIONANTE
Usa il sistema di modelli modulare per prevenire importazioni circolari e garantire robustezza.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Path, Body
import pandas as pd

# CORREZIONE FONDAMENTALE: Importa i modelli dal loro file specifico, non dal __init__
from app.models.anagraphics import (
    Anagraphics,
    AnagraphicsCreate,
    AnagraphicsUpdate,
    AnagraphicsListResponse
)
from app.models import APIResponse  # Le risposte generiche vengono dal __init__
from app.adapters.database_adapter import db_adapter

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=AnagraphicsListResponse, summary="Get Paginated Anagraphics List")
async def get_anagraphics_list(
    type_filter: Optional[str] = Query(None, description="Filter by type: Cliente or Fornitore"),
    search: Optional[str] = Query(None, description="Search in denomination, piva, cf"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=1000, description="Page size")
):
    """
    Recupera una lista paginata di anagrafiche.
    Permette di filtrare per tipo e di effettuare una ricerca testuale.
    """
    try:
        anagraphics_list = await db_adapter.get_anagraphics_async(type_filter=type_filter)
        
        if not anagraphics_list:
            return AnagraphicsListResponse(items=[], total=0, page=1, size=size, pages=0, success=True, message="No anagraphics found")
        
        df = pd.DataFrame(anagraphics_list)
        
        if search:
            search_lower = search.lower()
            # La ricerca ora è più robusta e non fallisce se una colonna è null
            search_mask = (
                df['denomination'].str.lower().str.contains(search_lower, na=False) |
                df['piva'].astype(str).str.contains(search_lower, na=False) |
                df['cf'].astype(str).str.contains(search_lower, na=False)
            )
            df = df[search_mask]

        total = len(df)
        if total == 0:
            return AnagraphicsListResponse(items=[], total=0, page=page, size=size, pages=0, success=True, message="No matching anagraphics found")

        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_df = df.iloc[start_idx:end_idx]
        
        items = paginated_df.to_dict('records')
        pages = (total + size - 1) // size

        return AnagraphicsListResponse(
            items=items,
            total=total,
            page=page,
            size=len(items),
            pages=pages,
            success=True,
            message="Anagraphics retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting anagraphics list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error while retrieving anagraphics: {str(e)}")

@router.get("/{anagraphics_id}", response_model=Anagraphics, summary="Get Anagraphics by ID")
async def get_anagraphics_by_id(anagraphics_id: int = Path(..., gt=0, description="The ID of the anagraphics record to retrieve")):
    """Recupera una singola anagrafica tramite il suo ID."""
    result = await db_adapter.execute_query_async("SELECT * FROM Anagraphics WHERE id = ?", (anagraphics_id,))
    if not result:
        raise HTTPException(status_code=404, detail="Anagraphics not found")
    return result[0]

@router.post("/", response_model=Anagraphics, status_code=201, summary="Create New Anagraphics")
async def create_anagraphics(anagraphics_data: AnagraphicsCreate):
    """Crea una nuova anagrafica."""
    if not anagraphics_data.piva and not anagraphics_data.cf:
        raise HTTPException(status_code=422, detail="Either VAT number (piva) or Tax Code (cf) must be provided")

    if anagraphics_data.piva:
        is_duplicate = await db_adapter.check_duplicate_async('Anagraphics', 'piva', anagraphics_data.piva)
        if is_duplicate:
            raise HTTPException(status_code=409, detail=f"Anagraphics with VAT number {anagraphics_data.piva} already exists")

    anag_dict = anagraphics_data.model_dump()
    new_id = await db_adapter.add_anagraphics_async(anag_dict, anagraphics_data.type.value)
    if not new_id:
        raise HTTPException(status_code=500, detail="Failed to create anagraphics record in the database")
    
    return await get_anagraphics_by_id(new_id)

@router.put("/{anagraphics_id}", response_model=Anagraphics, summary="Update Anagraphics")
async def update_anagraphics(anagraphics_id: int = Path(..., gt=0), data: AnagraphicsUpdate = Body(...)):
    """Aggiorna un'anagrafica esistente."""
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update provided")

    existing = await get_anagraphics_by_id(anagraphics_id) # Riusa l'endpoint per verificare l'esistenza

    fields_to_update = ", ".join([f"{key} = ?" for key in update_data.keys()])
    params = list(update_data.values())
    params.append(anagraphics_id)
    
    query = f"UPDATE Anagraphics SET {fields_to_update}, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    await db_adapter.execute_write_async(query, tuple(params))
    
    return await get_anagraphics_by_id(anagraphics_id)

@router.delete("/{anagraphics_id}", response_model=APIResponse, summary="Delete Anagraphics")
async def delete_anagraphics(anagraphics_id: int = Path(..., gt=0)):
    """Elimina un'anagrafica, solo se non ha fatture collegate."""
    invoices = await db_adapter.execute_query_async("SELECT 1 FROM Invoices WHERE anagraphics_id = ? LIMIT 1", (anagraphics_id,))
    if invoices:
        raise HTTPException(status_code=409, detail="Conflict: This record cannot be deleted because it is associated with one or more invoices.")
    
    rows_affected = await db_adapter.execute_write_async("DELETE FROM Anagraphics WHERE id = ?", (anagraphics_id,))
    if rows_affected == 0:
        raise HTTPException(status_code=404, detail="Anagraphics not found")
        
    return APIResponse(success=True, message="Anagraphics deleted successfully")
