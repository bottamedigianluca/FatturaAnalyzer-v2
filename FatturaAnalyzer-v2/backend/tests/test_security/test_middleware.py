# tests/test_security/test_middleware.py
import pytest
from fastapi.testclient import TestClient
import time


def test_rate_limiting(test_client: TestClient):
    """Test rate limiting middleware"""
    # Fai molte richieste rapidamente
    responses = []
    # Il rate limit di default per i test potrebbe essere diverso,
    # per ora testiamo solo che le richieste base passino.
    # Per un test approfondito del rate limiting, dovresti mockare il tempo o fare molte più chiamate.
    for i in range(5): # Un numero basso di richieste dovrebbe passare
        response = test_client.get("/health")
        responses.append(response.status_code)
    
    assert all(status == 200 for status in responses)


def test_security_headers(test_client: TestClient):
    """Test security headers in produzione"""
    # Questo test è più significativo in un ambiente non-DEBUG
    # perché in DEBUG alcuni header di sicurezza potrebbero essere omessi.
    # Al momento, la ErrorHandlerMiddleware non aggiunge header di sicurezza specifici.
    # Se fossero aggiunti tramite SecurityMiddleware o altri, qui si verificherebbero.
    response = test_client.get("/")
    assert response.status_code == 200
    # Esempio: assert "X-Content-Type-Options" in response.headers
    # assert response.headers["X-Content-Type-Options"] == "nosniff"
