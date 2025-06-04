# tests/test_adapters/test_database_adapter.py
import pytest
from app.adapters.database_adapter import db_adapter # Assicurati che l'import sia corretto


@pytest.mark.database
async def test_database_connection(test_db):
    """Test connessione database"""
    result = await db_adapter.execute_query_async("SELECT 1 as test")
    assert len(result) == 1
    assert result[0]["test"] == 1


@pytest.mark.database
async def test_add_anagraphics(test_db, sample_anagraphics_data):
    """Test aggiunta anagrafica tramite adapter"""
    anag_id = await db_adapter.add_anagraphics_async(
        sample_anagraphics_data, 
        sample_anagraphics_data["type"]
    )
    assert anag_id is not None
    assert anag_id > 0


@pytest.mark.database
async def test_get_anagraphics(test_db, populated_db):
    """Test recupero anagrafiche tramite adapter"""
    df = await db_adapter.get_anagraphics_async()
    assert not df.empty
    assert len(df) >= 1


@pytest.mark.database
async def test_check_duplicate(test_db, populated_db):
    """Test controllo duplicati"""
    # Dovrebbe trovare duplicato
    is_duplicate = await db_adapter.check_duplicate_async("Anagraphics", "piva", "12345678901")
    assert is_duplicate is True
    
    # Non dovrebbe trovare duplicato
    is_duplicate = await db_adapter.check_duplicate_async("Anagraphics", "piva", "99999999999")
    assert is_duplicate is False
