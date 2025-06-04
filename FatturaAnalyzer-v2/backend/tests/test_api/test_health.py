# tests/test_api/test_health.py
import pytest
from fastapi.testclient import TestClient


def test_health_check(test_client: TestClient):
    """Test health check endpoint"""
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "database" in data


def test_root_endpoint(test_client: TestClient):
    """Test root endpoint"""
    response = test_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "features" in data
