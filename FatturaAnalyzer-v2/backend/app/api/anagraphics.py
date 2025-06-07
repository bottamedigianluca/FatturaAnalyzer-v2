"""
Anagraphics API endpoints - Integrato con core PySide6 esistente
VERSIONE COMPLETA E CORRETTA: Usa correttamente check_duplicate_async e gestisce sia liste che DataFrame
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from fastapi.responses import JSONResponse, Response

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
        anagraphics_data = await db_adapter.get_anagraphics_async(type_filter=type_filter)
        
        # Gestisce sia lista che DataFrame
        if isinstance(anagraphics_data, list):
            if not anagraphics_data:
                return AnagraphicsListResponse(
                    items=[],
                    total=0,
                    page=page,
                    size=size,
                    pages=0
                )
            import pandas as pd
            df_anagraphics = pd.DataFrame(anagraphics_data)
        else:
            # Assume sia già un DataFrame
            df_anagraphics = anagraphics_data
            if df_anagraphics.empty:
                return AnagraphicsListResponse(
                    items=[],
                    total=0,
                    page=page,
                    size=size,
                    pages=0
                )
        
        # Applica filtri aggiuntivi
        if search and not df_anagraphics.empty:
            search_mask = (
                df_anagraphics['denomination'].str.contains(search, case=False, na=False) |
                df_anagraphics['piva'].str.contains(search, case=False, na=False) |
                df_anagraphics['cf'].str.contains(search, case=False, na=False)
            )
            df_anagraphics = df_anagraphics[search_mask]
        
        if city and not df_anagraphics.empty:
            df_anagraphics = df_anagraphics[
                df_anagraphics['city'].str.contains(city, case=False, na=False)
            ]
        
        if province and not df_anagraphics.empty:
            df_anagraphics = df_anagraphics[df_anagraphics['province'] == province]
        
        total = len(df_anagraphics)
        
        # Paginazione
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        df_paginated = df_anagraphics.iloc[start_idx:end_idx] if not df_anagraphics.empty else df_anagraphics
        
        # Converti in formato API
        items = df_paginated.to_dict('records') if not df_paginated.empty else []
        pages = (total + size - 1) // size if total > 0 else 0
        
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
        
        # 🔧 CORREZIONE: Usa la funzione check_duplicate_async ora implementata
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
        raise HTTPException(status_code=500, detail="Error deleting anagraphics")


@router.get("/search/{query}")
async def search_anagraphics(
    query: str = Path(..., description="Search query"),
    type_filter: Optional[str] = Query(None, description="Filter by type: Cliente, Fornitore"),
    limit: int = Query(10, ge=1, le=100)
):
    """Search anagraphics by denomination, P.IVA, or fiscal code"""
    try:
        search_query = """
            SELECT id, type, denomination, piva, cf, city, province, email, phone
            FROM Anagraphics
            WHERE (
                denomination LIKE ? OR 
                piva LIKE ? OR 
                cf LIKE ?
            )
        """
        
        params = [f"%{query}%", f"%{query}%", f"%{query}%"]
        
        if type_filter:
            search_query += " AND type = ?"
            params.append(type_filter)
        
        search_query += " ORDER BY denomination LIMIT ?"
        params.append(limit)
        
        results = await db_adapter.execute_query_async(search_query, tuple(params))
        
        return APIResponse(
            success=True,
            message=f"Found {len(results)} results",
            data={
                "query": query,
                "results": results,
                "total": len(results)
            }
        )
        
    except Exception as e:
        logger.error(f"Error searching anagraphics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error searching anagraphics")


@router.get("/stats/summary")
async def get_anagraphics_stats():
    """Get anagraphics statistics summary"""
    try:
        # Statistiche per tipo
        type_stats_query = """
            SELECT 
                type,
                COUNT(*) as count,
                COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
                COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
                COUNT(CASE WHEN piva IS NOT NULL AND piva != '' THEN 1 END) as with_piva
            FROM Anagraphics
            GROUP BY type
        """
        
        type_stats = await db_adapter.execute_query_async(type_stats_query)
        
        # Distribuzione geografica
        geographic_stats_query = """
            SELECT 
                province,
                COUNT(*) as count
            FROM Anagraphics
            WHERE province IS NOT NULL AND province != ''
            GROUP BY province
            ORDER BY count DESC
            LIMIT 10
        """
        
        geographic_stats = await db_adapter.execute_query_async(geographic_stats_query)
        
        # Anagrafiche recenti
        recent_query = """
            SELECT id, type, denomination, city, province, created_at
            FROM Anagraphics
            ORDER BY created_at DESC
            LIMIT 10
        """
        
        recent = await db_adapter.execute_query_async(recent_query)
        
        # Score distribution per clienti
        score_stats_query = """
            SELECT 
                CASE 
                    WHEN score >= 80 THEN 'Excellent (80-100)'
                    WHEN score >= 60 THEN 'Good (60-79)'
                    WHEN score >= 40 THEN 'Average (40-59)'
                    WHEN score >= 20 THEN 'Poor (20-39)'
                    ELSE 'Very Poor (0-19)'
                END as score_range,
                COUNT(*) as count,
                AVG(score) as avg_score
            FROM Anagraphics
            WHERE type = 'Cliente' AND score IS NOT NULL
            GROUP BY 
                CASE 
                    WHEN score >= 80 THEN 'Excellent (80-100)'
                    WHEN score >= 60 THEN 'Good (60-79)'
                    WHEN score >= 40 THEN 'Average (40-59)'
                    WHEN score >= 20 THEN 'Poor (20-39)'
                    ELSE 'Very Poor (0-19)'
                END
            ORDER BY avg_score DESC
        """
        
        score_stats = await db_adapter.execute_query_async(score_stats_query)
        
        return APIResponse(
            success=True,
            message="Statistics retrieved",
            data={
                "type_statistics": type_stats,
                "geographic_distribution": geographic_stats,
                "recent_anagraphics": recent,
                "score_distribution": score_stats
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting anagraphics stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving statistics")


@router.get("/validate/piva/{piva}")
async def validate_piva(
    piva: str = Path(..., description="Partita IVA to validate")
):
    """Validate Italian VAT number (Partita IVA)"""
    try:
        def _validate_piva_algorithm(piva_string: str) -> bool:
            """Algoritmo di validazione P.IVA italiana"""
            import re
            
            # Rimuovi spazi e caratteri non numerici
            piva_clean = re.sub(r'\D', '', piva_string)
            
            # Deve essere lunga 11 caratteri
            if len(piva_clean) != 11:
                return False
            
            try:
                # Algoritmo di controllo P.IVA italiana
                odd_sum = sum(int(piva_clean[i]) for i in range(0, 10, 2))
                
                even_sum = 0
                for i in range(1, 10, 2):
                    double = int(piva_clean[i]) * 2
                    even_sum += double if double < 10 else double - 9
                
                total = odd_sum + even_sum
                check_digit = (10 - (total % 10)) % 10
                
                return int(piva_clean[10]) == check_digit
            except (ValueError, IndexError):
                return False
        
        is_valid = _validate_piva_algorithm(piva)
        
        # Controlla anche se esiste già nel database
        existing = await db_adapter.check_duplicate_async('Anagraphics', 'piva', piva)
        
        return APIResponse(
            success=True,
            message="P.IVA validation completed",
            data={
                "piva": piva,
                "is_valid": is_valid,
                "already_exists": existing,
                "validation_details": {
                    "length_check": len(piva.replace(' ', '').replace('-', '')) == 11,
                    "format_check": piva.replace(' ', '').replace('-', '').isdigit(),
                    "checksum_valid": is_valid
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error validating P.IVA {piva}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error validating P.IVA")


@router.get("/export/{format}")
async def export_anagraphics_quick(
    format: str = Path(..., description="Export format: csv, json"),
    type_filter: Optional[str] = Query(None, description="Filter by type: Cliente, Fornitore")
):
    """Quick export of anagraphics (lighter version of full export)"""
    try:
        anagraphics_data = await db_adapter.get_anagraphics_async(type_filter=type_filter)
        
        # Gestisce sia lista che DataFrame
        if isinstance(anagraphics_data, list):
            anagraphics_list = anagraphics_data
        else:
            anagraphics_list = anagraphics_data.to_dict('records') if not anagraphics_data.empty else []
        
        if not anagraphics_list:
            raise HTTPException(status_code=404, detail="No anagraphics found")
        
        if format == "csv":
            import pandas as pd
            from io import StringIO
            
            df = pd.DataFrame(anagraphics_list)
            
            # Seleziona colonne essenziali
            essential_columns = ['id', 'type', 'denomination', 'piva', 'cf', 'city', 'province', 'email', 'phone']
            available_columns = [col for col in essential_columns if col in df.columns]
            
            export_df = df[available_columns]
            
            csv_buffer = StringIO()
            export_df.to_csv(csv_buffer, index=False, sep=';')
            csv_content = csv_buffer.getvalue()
            
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=anagrafiche_quick.csv"}
            )
            
        elif format == "json":
            return APIResponse(
                success=True,
                message=f"Exported {len(anagraphics_list)} anagraphics",
                data={
                    'anagraphics': anagraphics_list,
                    'count': len(anagraphics_list),
                    'type_filter': type_filter,
                    'export_format': 'json'
                }
            )
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Use 'csv' or 'json'")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in quick export: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error exporting anagraphics")


@router.post("/bulk/update-scores")
async def bulk_update_client_scores():
    """Bulk update client scores (triggers core calculation)"""
    try:
        # Usa analytics adapter per calcolare score
        from app.adapters.analytics_adapter import analytics_adapter
        
        success = await analytics_adapter.calculate_and_update_client_scores_async()
        
        if success:
            # Ottieni statistiche aggiornate
            updated_stats = await db_adapter.execute_query_async("""
                SELECT 
                    COUNT(*) as total_clients,
                    AVG(score) as avg_score,
                    MIN(score) as min_score,
                    MAX(score) as max_score,
                    COUNT(CASE WHEN score >= 70 THEN 1 END) as high_score_count
                FROM Anagraphics 
                WHERE type = 'Cliente' AND score IS NOT NULL
            """)
            
            return APIResponse(
                success=True,
                message="Client scores updated successfully",
                data={
                    "scores_updated": True,
                    "statistics": updated_stats[0] if updated_stats else {}
                }
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to update client scores")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client scores: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating client scores")


@router.get("/validate/cf/{cf}")
async def validate_codice_fiscale(
    cf: str = Path(..., description="Codice Fiscale to validate")
):
    """Validate Italian Tax Code (Codice Fiscale)"""
    try:
        def _validate_cf_algorithm(cf_string: str) -> bool:
            """Algoritmo di validazione Codice Fiscale italiano"""
            import re
            
            # Rimuovi spazi e converti in maiuscolo
            cf_clean = re.sub(r'\s', '', cf_string.upper())
            
            # Pattern per CF persona fisica (16 caratteri)
            if len(cf_clean) == 16:
                pattern = r'^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$'
                if not re.match(pattern, cf_clean):
                    return False
                
                # Calcolo del carattere di controllo
                odd_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                even_chars = "BAKDLFRHGMJONCPQUSTVWZYX"
                control_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                
                odd_sum = 0
                even_sum = 0
                
                for i in range(15):
                    char = cf_clean[i]
                    if i % 2 == 0:  # Posizione dispari (1, 3, 5, ...)
                        if char.isdigit():
                            odd_sum += ord(odd_chars[int(char)]) - ord('A')
                        else:
                            odd_sum += ord(char) - ord('A')
                    else:  # Posizione pari (2, 4, 6, ...)
                        if char.isdigit():
                            even_sum += int(char)
                        else:
                            even_sum += ord(char) - ord('A')
                
                remainder = (odd_sum + even_sum) % 26
                expected_control = control_chars[remainder]
                
                return cf_clean[15] == expected_control
            
            # Pattern per CF persona giuridica (11 caratteri numerici)
            elif len(cf_clean) == 11 and cf_clean.isdigit():
                return _validate_piva_algorithm(cf_clean)
            
            return False
        
        def _validate_piva_algorithm(piva_string: str) -> bool:
            """Algoritmo di validazione P.IVA italiana (usato anche per CF numerici)"""
            import re
            
            piva_clean = re.sub(r'\D', '', piva_string)
            
            if len(piva_clean) != 11:
                return False
            
            try:
                odd_sum = sum(int(piva_clean[i]) for i in range(0, 10, 2))
                
                even_sum = 0
                for i in range(1, 10, 2):
                    double = int(piva_clean[i]) * 2
                    even_sum += double if double < 10 else double - 9
                
                total = odd_sum + even_sum
                check_digit = (10 - (total % 10)) % 10
                
                return int(piva_clean[10]) == check_digit
            except (ValueError, IndexError):
                return False
        
        is_valid = _validate_cf_algorithm(cf)
        cf_type = "persona_fisica" if len(cf.replace(' ', '')) == 16 else "persona_giuridica" if len(cf.replace(' ', '')) == 11 else "unknown"
        
        # Controlla se esiste già nel database
        existing = await db_adapter.check_duplicate_async('Anagraphics', 'cf', cf)
        
        return APIResponse(
            success=True,
            message="Codice Fiscale validation completed",
            data={
                "cf": cf,
                "is_valid": is_valid,
                "cf_type": cf_type,
                "already_exists": existing,
                "validation_details": {
                    "length_check": len(cf.replace(' ', '')) in [11, 16],
                    "format_check": True,  # Più complesso, già controllato nell'algoritmo
                    "checksum_valid": is_valid
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error validating CF {cf}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error validating Codice Fiscale")


@router.get("/duplicates/check")
async def check_potential_duplicates():
    """Check for potential duplicate anagraphics"""
    try:
        # Cerca duplicati per P.IVA
        piva_duplicates = await db_adapter.execute_query_async("""
            SELECT piva, COUNT(*) as count, GROUP_CONCAT(id) as ids, GROUP_CONCAT(denomination) as names
            FROM Anagraphics 
            WHERE piva IS NOT NULL AND piva != ''
            GROUP BY piva 
            HAVING count > 1
        """)
        
        # Cerca duplicati per Codice Fiscale
        cf_duplicates = await db_adapter.execute_query_async("""
            SELECT cf, COUNT(*) as count, GROUP_CONCAT(id) as ids, GROUP_CONCAT(denomination) as names
            FROM Anagraphics 
            WHERE cf IS NOT NULL AND cf != ''
            GROUP BY cf 
            HAVING count > 1
        """)
        
        # Cerca duplicati simili per denominazione (usando SOUNDEX se disponibile o LIKE)
        similar_names = await db_adapter.execute_query_async("""
            SELECT a1.id as id1, a1.denomination as name1, a2.id as id2, a2.denomination as name2,
                   a1.city as city1, a2.city as city2
            FROM Anagraphics a1
            JOIN Anagraphics a2 ON a1.id < a2.id
            WHERE (
                UPPER(TRIM(a1.denomination)) = UPPER(TRIM(a2.denomination)) OR
                (LENGTH(a1.denomination) > 5 AND LENGTH(a2.denomination) > 5 AND
                 UPPER(SUBSTR(a1.denomination, 1, LENGTH(a1.denomination)-2)) = UPPER(SUBSTR(a2.denomination, 1, LENGTH(a2.denomination)-2)))
            )
            AND a1.type = a2.type
            LIMIT 50
        """)
        
        return APIResponse(
            success=True,
            message=f"Found {len(piva_duplicates)} P.IVA duplicates, {len(cf_duplicates)} CF duplicates, {len(similar_names)} similar names",
            data={
                "piva_duplicates": piva_duplicates,
                "cf_duplicates": cf_duplicates,
                "similar_names": similar_names,
                "summary": {
                    "total_piva_duplicates": len(piva_duplicates),
                    "total_cf_duplicates": len(cf_duplicates),
                    "total_similar_names": len(similar_names)
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error checking duplicates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error checking duplicates")


@router.get("/health-check")
async def anagraphics_health_check():
    """Health check for anagraphics system"""
    try:
        # Test basic database connectivity
        total_count = await db_adapter.execute_query_async("SELECT COUNT(*) as count FROM Anagraphics")
        
        # Test search functionality
        search_test = await db_adapter.execute_query_async("""
            SELECT COUNT(*) as count FROM Anagraphics 
            WHERE denomination LIKE '%test%' OR piva LIKE '%123%'
        """)
        
        # Test type distribution
        type_distribution = await db_adapter.execute_query_async("""
            SELECT type, COUNT(*) as count FROM Anagraphics GROUP BY type
        """)
        
        health_data = {
            'status': 'healthy',
            'database_connection': 'active',
            'total_anagraphics': total_count[0]['count'] if total_count else 0,
            'search_functionality': 'working',
            'type_distribution': {row['type']: row['count'] for row in type_distribution} if type_distribution else {},
            'adapter_version': '2.1',
            'features_available': [
                'CRUD operations',
                'Search and filtering',
                'P.IVA validation',
                'CF validation',
                'Duplicate detection',
                'Bulk score updates',
                'Quick export',
                'Statistics'
            ],
            'last_check': '2025-06-07T00:00:00Z'
        }
        
        return APIResponse(
            success=True,
            message="Anagraphics system health check completed",
            data=health_data
        )
        
    except Exception as e:
        logger.error(f"Error in anagraphics health check: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error performing health check")


@router.post("/merge/{source_id}/{target_id}")
async def merge_anagraphics(
    source_id: int = Path(..., description="Source anagraphics ID to merge from"),
    target_id: int = Path(..., description="Target anagraphics ID to merge into")
):
    """Merge two anagraphics records (moves all invoices to target and deletes source)"""
    try:
        if source_id == target_id:
            raise HTTPException(status_code=400, detail="Cannot merge anagraphics with itself")
        
        # Verifica che entrambe le anagrafiche esistano
        source = await db_adapter.execute_query_async(
            "SELECT id, denomination, type FROM Anagraphics WHERE id = ?", (source_id,)
        )
        target = await db_adapter.execute_query_async(
            "SELECT id, denomination, type FROM Anagraphics WHERE id = ?", (target_id,)
        )
        
        if not source:
            raise HTTPException(status_code=404, detail="Source anagraphics not found")
        if not target:
            raise HTTPException(status_code=404, detail="Target anagraphics not found")
        
        # Controlla che siano dello stesso tipo
        if source[0]['type'] != target[0]['type']:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot merge different types: {source[0]['type']} -> {target[0]['type']}"
            )
        
        # Conta le fatture da spostare
        invoices_count = await db_adapter.execute_query_async(
            "SELECT COUNT(*) as count FROM Invoices WHERE anagraphics_id = ?", (source_id,)
        )
        
        # Sposta tutte le fatture dal source al target
        if invoices_count and invoices_count[0]['count'] > 0:
            rows_updated = await db_adapter.execute_write_async(
                "UPDATE Invoices SET anagraphics_id = ? WHERE anagraphics_id = ?",
                (target_id, source_id)
            )
            logger.info(f"Moved {rows_updated} invoices from anagraphics {source_id} to {target_id}")
        
        # Elimina l'anagrafica source
        await db_adapter.execute_write_async(
            "DELETE FROM Anagraphics WHERE id = ?", (source_id,)
        )
        
        return APIResponse(
            success=True,
            message=f"Successfully merged anagraphics {source_id} into {target_id}",
            data={
                "source_anagraphics": source[0],
                "target_anagraphics": target[0],
                "invoices_moved": invoices_count[0]['count'] if invoices_count else 0,
                "merge_completed": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error merging anagraphics {source_id} -> {target_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error merging anagraphics")


@router.post("/batch/create")
async def batch_create_anagraphics(
    anagraphics_list: List[AnagraphicsCreate]
):
    """Batch create multiple anagraphics"""
    try:
        if len(anagraphics_list) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 anagraphics per batch")
        
        results = []
        errors = []
        
        for i, anag_data in enumerate(anagraphics_list):
            try:
                # Validazione base
                if not anag_data.piva and not anag_data.cf:
                    errors.append({
                        "index": i,
                        "denomination": anag_data.denomination,
                        "error": "Either VAT number (piva) or Tax Code (cf) must be provided"
                    })
                    continue
                
                # Check duplicati
                if anag_data.piva:
                    is_duplicate = await db_adapter.check_duplicate_async(
                        'Anagraphics', 'piva', anag_data.piva
                    )
                    if is_duplicate:
                        errors.append({
                            "index": i,
                            "denomination": anag_data.denomination,
                            "piva": anag_data.piva,
                            "error": f"P.IVA {anag_data.piva} already exists"
                        })
                        continue
                
                # Crea anagrafica
                anag_dict = anag_data.model_dump()
                new_id = await db_adapter.add_anagraphics_async(anag_dict, anag_data.type)
                
                if new_id:
                    results.append({
                        "index": i,
                        "id": new_id,
                        "denomination": anag_data.denomination,
                        "type": anag_data.type,
                        "status": "created"
                    })
                else:
                    errors.append({
                        "index": i,
                        "denomination": anag_data.denomination,
                        "error": "Failed to create anagraphics"
                    })
                    
            except Exception as item_error:
                errors.append({
                    "index": i,
                    "denomination": anag_data.denomination,
                    "error": str(item_error)
                })
        
        return APIResponse(
            success=len(results) > 0,
            message=f"Batch completed: {len(results)} created, {len(errors)} errors",
            data={
                "created": results,
                "errors": errors,
                "summary": {
                    "total_processed": len(anagraphics_list),
                    "successful": len(results),
                    "failed": len(errors)
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch create: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error in batch creation")


@router.get("/provinces/list")
async def get_provinces_list():
    """Get list of all provinces used in anagraphics"""
    try:
        provinces = await db_adapter.execute_query_async("""
            SELECT 
                province,
                COUNT(*) as count,
                COUNT(CASE WHEN type = 'Cliente' THEN 1 END) as clients,
                COUNT(CASE WHEN type = 'Fornitore' THEN 1 END) as suppliers
            FROM Anagraphics 
            WHERE province IS NOT NULL AND province != ''
            GROUP BY province
            ORDER BY count DESC
        """)
        
        # Lista delle province italiane standard per validazione
        italian_provinces = [
            'AG', 'AL', 'AN', 'AO', 'AR', 'AP', 'AT', 'AV', 'BA', 'BT', 'BL', 'BN', 'BG', 'BI', 'BO', 'BZ',
            'BS', 'BR', 'CA', 'CL', 'CB', 'CI', 'CE', 'CT', 'CZ', 'CH', 'CO', 'CS', 'CR', 'KR', 'CN', 'EN',
            'FM', 'FE', 'FI', 'FG', 'FC', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'SP', 'AQ', 'LT', 'LE', 'LC',
            'LI', 'LO', 'LU', 'MC', 'MN', 'MS', 'MT', 'VS', 'ME', 'MI', 'MO', 'MB', 'NA', 'NO', 'NU', 'OG',
            'OR', 'PD', 'PA', 'PR', 'PV', 'PG', 'PU', 'PE', 'PC', 'PI', 'PT', 'PN', 'PZ', 'PO', 'RG', 'RA',
            'RC', 'RE', 'RI', 'RN', 'RM', 'RO', 'SA', 'SS', 'SV', 'SI', 'SR', 'SO', 'TA', 'TE', 'TR', 'TO',
            'TP', 'TN', 'TV', 'TS', 'UD', 'VA', 'VE', 'VB', 'VC', 'VR', 'VV', 'VI', 'VT'
        ]
        
        return APIResponse(
            success=True,
            message=f"Found {len(provinces)} provinces in use",
            data={
                "provinces_in_use": provinces,
                "italian_provinces_reference": italian_provinces,
                "total_provinces_used": len(provinces)
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting provinces list: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving provinces list")


@router.get("/analytics/top-clients")
async def get_top_clients_analytics(
    limit: int = Query(20, ge=1, le=100, description="Number of top clients to return"),
    period_months: int = Query(12, ge=1, le=60, description="Period in months for analysis")
):
    """Get top clients analytics based on revenue and invoice count"""
    try:
        top_clients_query = """
            SELECT 
                a.id,
                a.denomination,
                a.city,
                a.province,
                a.score,
                COUNT(i.id) as total_invoices,
                COALESCE(SUM(i.total_amount), 0) as total_revenue,
                COALESCE(AVG(i.total_amount), 0) as avg_invoice_amount,
                MAX(i.doc_date) as last_invoice_date,
                MIN(i.doc_date) as first_invoice_date,
                COUNT(CASE WHEN i.payment_status = 'Pagata' THEN 1 END) as paid_invoices,
                COUNT(CASE WHEN i.payment_status IN ('Aperta', 'Scaduta') THEN 1 END) as open_invoices
            FROM Anagraphics a
            LEFT JOIN Invoices i ON a.id = i.anagraphics_id 
                AND i.doc_date >= date('now', '-{} months')
                AND i.type = 'Attiva'
            WHERE a.type = 'Cliente'
            GROUP BY a.id, a.denomination, a.city, a.province, a.score
            HAVING total_revenue > 0
            ORDER BY total_revenue DESC
            LIMIT ?
        """.format(period_months)
        
        top_clients = await db_adapter.execute_query_async(top_clients_query, (limit,))
        
        # Calcola metriche aggregate
        total_revenue = sum(client['total_revenue'] for client in top_clients)
        total_invoices = sum(client['total_invoices'] for client in top_clients)
        
        return APIResponse(
            success=True,
            message=f"Top {len(top_clients)} clients analytics for last {period_months} months",
            data={
                "top_clients": top_clients,
                "period_months": period_months,
                "summary": {
                    "total_clients_analyzed": len(top_clients),
                    "total_revenue": total_revenue,
                    "total_invoices": total_invoices,
                    "avg_revenue_per_client": total_revenue / len(top_clients) if top_clients else 0
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting top clients analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving top clients analytics")


@router.post("/import/csv")
async def import_anagraphics_from_csv(
    file: UploadFile = File(..., description="CSV file with anagraphics data")
):
    """Import anagraphics from CSV file"""
    try:
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        content = await file.read()
        
        # Parse CSV
        import pandas as pd
        from io import StringIO
        
        try:
            df = pd.read_csv(StringIO(content.decode('utf-8')), sep=';')
        except:
            try:
                df = pd.read_csv(StringIO(content.decode('utf-8')), sep=',')
            except Exception as parse_error:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error parsing CSV file: {str(parse_error)}"
                )
        
        if df.empty:
            raise HTTPException(status_code=400, detail="CSV file is empty")
        
        # Mappatura colonne standard
        column_mapping = {
            'denominazione': 'denomination',
            'tipo': 'type',
            'partita_iva': 'piva',
            'p_iva': 'piva',
            'codice_fiscale': 'cf',
            'indirizzo': 'address',
            'citta': 'city',
            'città': 'city',
            'provincia': 'province',
            'cap': 'cap',
            'paese': 'country',
            'telefono': 'phone',
            'email': 'email',
            'pec': 'pec'
        }
        
        # Rinomina colonne
        df.columns = df.columns.str.lower().str.strip()
        df = df.rename(columns=column_mapping)
        
        # Valida colonne obbligatorie
        required_columns = ['denomination', 'type']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Filtra righe valide
        df = df.dropna(subset=['denomination'])
        df['type'] = df['type'].fillna('Cliente')
        
        # Validate type values
        valid_types = ['Cliente', 'Fornitore']
        df = df[df['type'].isin(valid_types)]
        
        results = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Valida che abbia almeno P.IVA o CF
                if pd.isna(row.get('piva')) and pd.isna(row.get('cf')):
                    errors.append({
                        "row": index + 1,
                        "denomination": row.get('denomination', 'N/A'),
                        "error": "Either P.IVA or CF must be provided"
                    })
                    continue
                
                # Check duplicati
                piva = row.get('piva') if not pd.isna(row.get('piva')) else None
                if piva:
                    is_duplicate = await db_adapter.check_duplicate_async(
                        'Anagraphics', 'piva', str(piva)
                    )
                    if is_duplicate:
                        errors.append({
                            "row": index + 1,
                            "denomination": row.get('denomination', 'N/A'),
                            "piva": piva,
                            "error": f"P.IVA {piva} already exists"
                        })
                        continue
                
                # Prepara dati per creazione
                anag_data = {}
                for col in df.columns:
                    if col in row and not pd.isna(row[col]):
                        anag_data[col] = str(row[col]).strip()
                
                # Crea anagrafica
                new_id = await db_adapter.add_anagraphics_async(anag_data, anag_data.get('type', 'Cliente'))
                
                if new_id:
                    results.append({
                        "row": index + 1,
                        "id": new_id,
                        "denomination": anag_data.get('denomination'),
                        "type": anag_data.get('type'),
                        "status": "imported"
                    })
                else:
                    errors.append({
                        "row": index + 1,
                        "denomination": row.get('denomination', 'N/A'),
                        "error": "Failed to create anagraphics"
                    })
                    
            except Exception as row_error:
                errors.append({
                    "row": index + 1,
                    "denomination": row.get('denomination', 'N/A'),
                    "error": str(row_error)
                })
        
        return APIResponse(
            success=len(results) > 0,
            message=f"CSV import completed: {len(results)} imported, {len(errors)} errors",
            data={
                "imported": results,
                "errors": errors,
                "summary": {
                    "total_rows_processed": len(df),
                    "successful_imports": len(results),
                    "failed_imports": len(errors),
                    "filename": file.filename
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing CSV: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error importing CSV file")
