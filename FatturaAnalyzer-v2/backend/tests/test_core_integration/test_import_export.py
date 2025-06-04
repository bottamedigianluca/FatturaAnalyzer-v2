# tests/test_core_integration/test_import_export.py
import pytest
from httpx import AsyncClient
from pathlib import Path # Aggiunto per mock_xml_file


@pytest.mark.integration
async def test_validate_xml_file(async_client: AsyncClient, mock_xml_file):
    """Test validazione file XML"""
    with open(mock_xml_file, 'rb') as f:
        files = {"file": ("test_invoice.xml", f, "application/xml")}
        response = await async_client.post("/api/import/validate-file", files=files)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.integration
async def test_import_csv_transactions(async_client: AsyncClient, mock_csv_content, test_db):
    """Test import transazioni CSV"""
    from io import StringIO
    
    csv_file = StringIO(mock_csv_content)
    files = {"file": ("transactions.csv", csv_file.getvalue(), "text/csv")}
    
    response = await async_client.post("/api/import/transactions/csv", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "processed" in data # Verifichiamo la struttura della risposta di ImportResult
    assert data["success"] >= 0 # Almeno 0 transazioni processate con successo


@pytest.mark.integration
async def test_export_anagraphics_json(async_client: AsyncClient, populated_db):
    """Test export anagrafiche JSON"""
    response = await async_client.get("/api/import/export/anagraphics?format=json")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "anagraphics" in data["data"]
