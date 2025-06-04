# tests/test_api/test_transactions.py
import pytest
from httpx import AsyncClient


@pytest.mark.api
async def test_get_transactions_list(async_client: AsyncClient, populated_db):
    """Test recupero lista transazioni"""
    response = await async_client.get("/api/transactions/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.api
async def test_get_transaction_by_id(async_client: AsyncClient, populated_db):
    """Test recupero transazione per ID"""
    transaction_id = populated_db["transaction_id"]
    response = await async_client.get(f"/api/transactions/{transaction_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == transaction_id
    assert "amount" in data
    assert "remaining_amount" in data


@pytest.mark.api
async def test_transaction_potential_matches(async_client: AsyncClient, populated_db):
    """Test ricerca potenziali match per transazione"""
    transaction_id = populated_db["transaction_id"]
    response = await async_client.get(f"/api/transactions/{transaction_id}/potential-matches")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.api
async def test_update_transaction_status(async_client: AsyncClient, populated_db):
    """Test aggiornamento stato riconciliazione transazione"""
    transaction_id = populated_db["transaction_id"]
    response = await async_client.post(
        f"/api/transactions/{transaction_id}/update-status",
        json={
            "reconciliation_status": "Riconciliato Tot.",
            "reconciled_amount": 1000.00
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
