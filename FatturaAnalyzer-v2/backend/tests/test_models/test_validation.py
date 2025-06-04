# tests/test_models/test_validation.py
import pytest
from pydantic import ValidationError
from app.models import AnagraphicsCreate, InvoiceCreate, BankTransactionCreate # Assicurati che l'import sia corretto


def test_anagraphics_validation():
    """Test validazione modelli anagrafica"""
    # Dati validi
    valid_data = {
        "type": "Cliente",
        "denomination": "Test SRL",
        "piva": "12345678901"
    }
    anag = AnagraphicsCreate(**valid_data)
    assert anag.denomination == "Test SRL"
    
    # Dati non validi
    with pytest.raises(ValidationError):
        AnagraphicsCreate(type="Cliente", denomination="Test", piva="123")  # PIVA troppo corta


def test_invoice_validation():
    """Test validazione modelli fattura"""
    valid_data = {
        "anagraphics_id": 1,
        "type": "Attiva",
        "doc_number": "001",
        "doc_date": "2024-01-15",
        "total_amount": 1000.00
    }
    invoice = InvoiceCreate(**valid_data)
    assert invoice.total_amount == 1000.00
    
    # Importo negativo non valido
    with pytest.raises(ValidationError):
        InvoiceCreate(**{**valid_data, "total_amount": -100})


def test_transaction_validation():
    """Test validazione modelli transazione"""
    valid_data = {
        "transaction_date": "2024-01-15",
        "amount": 1000.00,
        "description": "Test transaction",
        "unique_hash": "test123abc" # L'hash deve essere di una certa lunghezza e complessità
    }
    transaction = BankTransactionCreate(**valid_data)
    assert transaction.amount == 1000.00
