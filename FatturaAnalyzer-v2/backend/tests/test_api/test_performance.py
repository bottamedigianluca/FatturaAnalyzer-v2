# tests/test_api/test_performance.py
import pytest
from httpx import AsyncClient
import time
from app.adapters.database_adapter import db_adapter # Assicurati l'import

@pytest.mark.slow
async def test_large_dataset_performance(async_client: AsyncClient, test_db):
    """Test performance con dataset grande"""
    # Crea molte anagrafiche di test
    for i in range(100):
        anag_data = {
            "type": "Cliente",
            "denomination": f"Test Client {i}",
            "piva": f"1234567890{i % 10}" # Assicura PIVA univoca per evitare errori di duplicato se non pulisci DB
        }
        # Usa l'adapter per creare anagrafiche, questo assicura che il DB sia effettivamente popolato
        await db_adapter.add_anagraphics_async(anag_data, "Cliente") 
    
    # Test performance recupero lista
    start_time = time.time()
    response = await async_client.get("/api/anagraphics/?size=100")
    end_time = time.time()
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 100 # Verifica che le anagrafiche siano state create
    assert (end_time - start_time) < 2.0  # Dovrebbe completare in meno di 2 secondi
