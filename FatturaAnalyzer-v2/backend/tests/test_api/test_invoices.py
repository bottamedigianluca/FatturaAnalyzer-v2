# tests/test_api/test_invoices.py
import pytest
from httpx import AsyncClient


@pytest.mark.api
async def test_get_invoices_list(async_client: AsyncClient, populated_db):
    """Test recupero lista fatture"""
    response = await async_client.get("/api/invoices/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.api
async def test_get_invoice_by_id(async_client: AsyncClient, populated_db):
    """Test recupero fattura per ID"""
    invoice_id = populated_db["invoice_id"]
    response = await async_client.get(f"/api/invoices/{invoice_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == invoice_id
    assert "doc_number" in data
    assert "lines" in data # Assuming your model and API return these
    assert "vat_summary" in data # Assuming your model and API return these


@pytest.mark.api
async def test_invoice_search(async_client: AsyncClient, populated_db):
    """Test ricerca fatture"""
    response = await async_client.get("/api/invoices/search/TEST001")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "results" in data["data"]


@pytest.mark.api
async def test_update_invoice_payment_status(async_client: AsyncClient, populated_db):
    """Test aggiornamento stato pagamento fattura"""
    invoice_id = populated_db["invoice_id"]
    response = await async_client.post(
        f"/api/invoices/{invoice_id}/update-payment-status",
        params={"payment_status": "Pagata Tot.", "paid_amount": 1000.00}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
