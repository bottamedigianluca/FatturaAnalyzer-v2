# tests/test_api/test_analytics.py
import pytest
from httpx import AsyncClient


@pytest.mark.api
async def test_get_dashboard_data(async_client: AsyncClient, populated_db):
    """Test recupero dati dashboard"""
    response = await async_client.get("/api/analytics/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "recent_invoices" in data
    assert "recent_transactions" in data


@pytest.mark.api
async def test_get_kpis(async_client: AsyncClient, populated_db):
    """Test recupero KPI"""
    response = await async_client.get("/api/analytics/kpis")
    assert response.status_code == 200
    data = response.json()
    assert "total_receivables" in data
    assert "total_payables" in data


@pytest.mark.api
async def test_get_cash_flow_monthly(async_client: AsyncClient, populated_db):
    """Test analisi cash flow mensile"""
    response = await async_client.get("/api/analytics/cash-flow/monthly?months=6")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.api
async def test_get_revenue_trends(async_client: AsyncClient, populated_db):
    """Test trend fatturato"""
    response = await async_client.get("/api/analytics/trends/revenue?period=monthly")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "trends" in data["data"]
