# tests/test_api/test_reconciliation.py
import pytest
from httpx import AsyncClient


@pytest.mark.api
async def test_get_reconciliation_suggestions(async_client: AsyncClient, populated_db):
    """Test recupero suggerimenti riconciliazione"""
    response = await async_client.get("/api/reconciliation/suggestions")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "suggestions" in data["data"]


@pytest.mark.api
async def test_get_reconciliation_status(async_client: AsyncClient, populated_db):
    """Test recupero stato riconciliazione"""
    response = await async_client.get("/api/reconciliation/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.api
async def test_validate_reconciliation_match(async_client: AsyncClient, populated_db):
    """Test validazione match riconciliazione"""
    invoice_id = populated_db["invoice_id"]
    transaction_id = populated_db["transaction_id"]
    
    response = await async_client.post(
        "/api/reconciliation/validate-match",
        json={
            "invoice_id": invoice_id,
            "transaction_id": transaction_id,
            "amount": 1000.00
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "valid" in data["data"]


@pytest.mark.api
async def test_perform_reconciliation(async_client: AsyncClient, populated_db):
    """Test esecuzione riconciliazione"""
    invoice_id = populated_db["invoice_id"]
    transaction_id = populated_db["transaction_id"]
    
    response = await async_client.post(
        "/api/reconciliation/reconcile",
        json={
            "invoice_id": invoice_id,
            "transaction_id": transaction_id,
            "amount": 1000.00
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
