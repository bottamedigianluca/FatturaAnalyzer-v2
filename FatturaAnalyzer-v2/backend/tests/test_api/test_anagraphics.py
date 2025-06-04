# tests/test_api/test_anagraphics.py
import pytest
from httpx import AsyncClient


@pytest.mark.api
async def test_create_anagraphics(async_client: AsyncClient, test_db, sample_anagraphics_data):
    """Test creazione anagrafica"""
    response = await async_client.post("/api/anagraphics/", json=sample_anagraphics_data)
    assert response.status_code == 200
    data = response.json()
    assert data["denomination"] == sample_anagraphics_data["denomination"]
    assert data["piva"] == sample_anagraphics_data["piva"]
    assert "id" in data


@pytest.mark.api
async def test_get_anagraphics_list(async_client: AsyncClient, populated_db):
    """Test recupero lista anagrafiche"""
    response = await async_client.get("/api/anagraphics/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.api
async def test_get_anagraphics_by_id(async_client: AsyncClient, populated_db):
    """Test recupero anagrafica per ID"""
    anag_id = populated_db["anagraphics_id"]
    response = await async_client.get(f"/api/anagraphics/{anag_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == anag_id
    assert "denomination" in data


@pytest.mark.api
async def test_anagraphics_not_found(async_client: AsyncClient, test_db):
    """Test anagrafica non trovata"""
    response = await async_client.get("/api/anagraphics/999")
    assert response.status_code == 404


@pytest.mark.api
async def test_create_anagraphics_validation_error(async_client: AsyncClient, test_db):
    """Test errore validazione creazione anagrafica"""
    invalid_data = {"type": "Cliente"}  # Manca denomination
    response = await async_client.post("/api/anagraphics/", json=invalid_data)
    assert response.status_code == 422
