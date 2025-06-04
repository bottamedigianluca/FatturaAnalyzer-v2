# tests/test_api/test_e2e_workflow.py
import pytest
from httpx import AsyncClient


@pytest.mark.integration
async def test_complete_workflow(async_client: AsyncClient, test_db, sample_anagraphics_data):
    """Test workflow completo: crea anagrafica -> fattura -> transazione -> riconciliazione"""
    
    # 1. Crea anagrafica
    response = await async_client.post("/api/anagraphics/", json=sample_anagraphics_data)
    assert response.status_code == 200
    anag_data = response.json()
    anag_id = anag_data["id"]
    
    # 2. Crea fattura
    # Modifica: unique_hash va generato dal client o non incluso se API lo genera
    # Per ora, lo rimuoviamo, assumendo che l'API lo gestisca
    invoice_data_payload = {
        "anagraphics_id": anag_id,
        "type": "Attiva",
        "doc_number": "WORKFLOW001",
        "doc_date": "2024-01-15",
        "total_amount": 1000.00,
        "doc_type": "TD01", # Assicurati che i modelli API lo supportino
        # "unique_hash": "inv_workflow_hash_123" # Rimosso o da generare correttamente
    }
    response = await async_client.post("/api/invoices/", json=invoice_data_payload)
    assert response.status_code == 200
    invoice = response.json()
    invoice_id = invoice["id"]
    
    # 3. Crea transazione
    transaction_data_payload = {
        "transaction_date": "2024-01-15",
        "amount": 1000.00,
        "description": "Pagamento fattura WORKFLOW001",
        "unique_hash": "workflow_hash_123abc" # L'hash deve essere univoco per transazione
    }
    response = await async_client.post("/api/transactions/", json=transaction_data_payload)
    assert response.status_code == 200
    transaction = response.json()
    transaction_id = transaction["id"]
    
    # 4. Valida match riconciliazione
    response = await async_client.post(
        "/api/reconciliation/validate-match",
        json={
            "invoice_id": invoice_id,
            "transaction_id": transaction_id,
            "amount": 1000.00
        }
    )
    assert response.status_code == 200
    validation = response.json()
    assert validation["success"] is True
    assert validation["data"]["valid"] is True # Assumendo che la risposta contenga un campo valid
    
    # 5. Esegui riconciliazione
    response = await async_client.post(
        "/api/reconciliation/reconcile",
        json={
            "invoice_id": invoice_id,
            "transaction_id": transaction_id,
            "amount": 1000.00
        }
    )
    assert response.status_code == 200
    recon_result = response.json()
    assert recon_result["success"] is True
    
    # 6. Verifica stato finale
    response = await async_client.get(f"/api/invoices/{invoice_id}")
    assert response.status_code == 200
    final_invoice = response.json()
    assert final_invoice["payment_status"] in ["Pagata Tot.", "Riconciliata"]
