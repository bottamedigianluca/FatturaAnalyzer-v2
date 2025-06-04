import asyncio
import os
import pytest
import tempfile
from pathlib import Path
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock
import sys
print("DEBUG conftest.py sys.path:", sys.path)

from fastapi.testclient import TestClient
from httpx import AsyncClient

# Imposta environment di test prima degli import
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_PATH"] = ":memory:"
os.environ["DEBUG"] = "true"

from app.main import app
from app.config import settings
from app.adapters.database_adapter import db_adapter


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_client() -> Generator[TestClient, None, None]:
    """Sync test client per FastAPI"""
    with TestClient(app) as client:
        yield client


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async test client per FastAPI"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture(scope="function")
async def test_db():
    """Database di test in memoria, pulito per ogni test"""
    # Setup: crea tabelle
    await db_adapter.create_tables_async()
    
    yield db_adapter
    
    # Teardown: pulizia non necessaria per in-memory DB


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Directory temporanea per test"""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)


@pytest.fixture
def sample_anagraphics_data():
    """Dati di esempio per anagrafiche"""
    return {
        "type": "Cliente",
        "denomination": "Test Client SRL",
        "piva": "12345678901",
        "cf": "12345678901",
        "address": "Via Test 123",
        "cap": "00123",
        "city": "Roma",
        "province": "RM",
        "country": "IT",
        "email": "test@testclient.com",
        "phone": "+39 06 1234567"
    }


@pytest.fixture
def sample_invoice_data():
    """Dati di esempio per fatture"""
    return {
        "anagraphics_id": 1,
        "type": "Attiva",
        "doc_type": "TD01",
        "doc_number": "TEST001",
        "doc_date": "2024-01-15",
        "total_amount": 1000.00,
        "due_date": "2024-02-15",
        "payment_method": "Bonifico"
    }


@pytest.fixture
def sample_transaction_data():
    """Dati di esempio per transazioni bancarie"""
    return {
        "transaction_date": "2024-01-15",
        "value_date": "2024-01-15",
        "amount": 1000.00,
        "description": "Versamento da Test Client SRL",
        "unique_hash": "test_hash_12345"
    }


@pytest.fixture
async def populated_db(test_db, sample_anagraphics_data, sample_invoice_data, sample_transaction_data):
    """Database con dati di test"""
    # Crea anagrafica
    anag_id = await db_adapter.add_anagraphics_async(
        sample_anagraphics_data, 
        sample_anagraphics_data["type"]
    )
    
    # Crea fattura
    sample_invoice_data["anagraphics_id"] = anag_id
    invoice_query = """
        INSERT INTO Invoices 
        (anagraphics_id, type, doc_type, doc_number, doc_date, total_amount, 
         due_date, payment_method, unique_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """
    invoice_id = await db_adapter.execute_write_async(invoice_query, (
        anag_id, "Attiva", "TD01", "TEST001", "2024-01-15", 1000.00,
        "2024-02-15", "Bonifico", "invoice_hash_123"
    ))
    
    # Crea transazione
    trans_query = """
        INSERT INTO BankTransactions 
        (transaction_date, value_date, amount, description, unique_hash, 
         reconciled_amount, reconciliation_status, created_at)
        VALUES (?, ?, ?, ?, ?, 0.0, 'Da Riconciliare', datetime('now'))
    """
    trans_id = await db_adapter.execute_write_async(trans_query, (
        "2024-01-15", "2024-01-15", 1000.00, 
        "Versamento da Test Client SRL", "test_hash_12345"
    ))
    
    return {
        "anagraphics_id": anag_id,
        "invoice_id": invoice_id,
        "transaction_id": trans_id
    }


@pytest.fixture
def mock_google_drive_service():
    """Mock per Google Drive API"""
    mock_service = MagicMock()
    mock_service.files().get().execute.return_value = {
        "id": "test_file_id",
        "name": "test_database.db",
        "size": "1024",
        "modifiedTime": "2024-01-15T10:00:00Z"
    }
    mock_service.files().list().execute.return_value = {
        "files": []
    }
    return mock_service


@pytest.fixture
def mock_xml_file(temp_dir):
    """Crea file XML di test per fattura elettronica"""
    xml_content = """<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdCodice>TEST001</IdCodice>
        <IdPaese>IT</IdPaese>
      </IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>0000000</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>12345678901</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>Test Company SRL</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Test 123</Indirizzo>
        <CAP>00123</CAP>
        <Comune>Roma</Comune>
        <Provincia>RM</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>98765432109</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>Test Client SRL</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Client 456</Indirizzo>
        <CAP>00456</CAP>
        <Comune>Milano</Comune>
        <Provincia>MI</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2024-01-15</Data>
        <Numero>TEST001</Numero>
        <ImportoTotaleDocumento>1220.00</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Servizio di consulenza</Descrizione>
        <Quantita>1.00</Quantita>
        <PrezzoUnitario>1000.00</PrezzoUnitario>
        <PrezzoTotale>1000.00</PrezzoTotale>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>1000.00</ImponibileImporto>
        <Imposta>220.00</Imposta>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>"""
    
    xml_file = temp_dir / "test_invoice.xml"
    xml_file.write_text(xml_content, encoding="utf-8")
    return xml_file


@pytest.fixture
def mock_csv_content():
    """CSV di test per transazioni bancarie"""
    return """DATA;VALUTA;DARE;AVERE;DESCRIZIONE OPERAZIONE;CAUSALE ABI
2024-01-15;2024-01-15;;1000.00;VERSAMENTO DA TEST CLIENT SRL;103
2024-01-16;2024-01-16;150.00;;PAGAMENTO FORNITORE ABC SPA;
2024-01-17;2024-01-17;25.50;;COMMISSIONI BANCARIE;"""


# Utility functions per test
def assert_response_success(response, expected_status=200):
    """Asserisce che la response sia successful"""
    assert response.status_code == expected_status
    data = response.json()
    assert data.get("success") is True
    return data


def assert_response_error(response, expected_status=400):
    """Asserisce che la response sia un errore"""
    assert response.status_code == expected_status
    data = response.json()
    assert data.get("success") is False
    return data


@pytest.fixture(autouse=True)
def clean_environment():
    """Pulisce environment variables tra test"""
    yield
    # Cleanup non necessario per test isolati


# Markers personalizzati
pytest.mark.api = pytest.mark.asyncio
pytest.mark.database = pytest.mark.asyncio
pytest.mark.integration = pytest.mark.asyncio
@pytest.fixture
def api_headers():
    """Headers standard per richieste API"""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }


@pytest.fixture
def auth_headers(api_headers):
    """Headers con autenticazione (se necessaria)"""
    # Modifica "test-token" se usi un token reale o generato diversamente
    # Potrebbe anche essere letto da una variabile d'ambiente o da un file
    # Se non hai autenticazione, questa fixture potrebbe non essere necessaria
    # o semplicemente restituire api_headers.
    from app.middleware.auth import api_key_auth # Importa qui per evitare problemi di import circolari
    
    # Usa la chiave locale generata/caricata
    local_key = list(api_key_auth.api_keys.keys())[0] # Prendi la prima chiave disponibile (locale)

    return {
        **api_headers,
        "Authorization": f"Bearer {local_key}" 
    }
