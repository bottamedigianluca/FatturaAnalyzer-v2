# app/api/setup.py
"""
Setup Wizard API endpoints per configurazione guidata
"""

import logging
import os
import re
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, List
from pathlib import Path
import configparser

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from app.models import APIResponse
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class CompanyDataExtractor:
    """Estrae dati aziendali da fatture XML"""
    
    @staticmethod
    def extract_from_xml(xml_content: str, invoice_type: str = "active") -> Dict[str, Any]:
        """
        Estrae dati azienda da XML fattura elettronica
        
        Args:
            xml_content: Contenuto XML della fattura
            invoice_type: "active" per fattura attiva, "passive" per passiva
        """
        try:
            # Parse XML
            root = ET.fromstring(xml_content)
            
            # Namespace handling
            ns = {
                'p': 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2'
            }
            
            # Per fattura attiva, i dati della nostra azienda sono in CedentePrestatore
            # Per fattura passiva, sono in CessionarioCommittente
            if invoice_type == "active":
                company_path = ".//p:CedentePrestatore"
            else:
                company_path = ".//p:CessionarioCommittente"
            
            company_node = root.find(company_path, ns)
            if not company_node:
                raise ValueError(f"Nodo {company_path} non trovato nell'XML")
            
            # Estrai dati anagrafici
            dati_anagrafici = company_node.find(".//p:DatiAnagrafici", ns)
            sede = company_node.find(".//p:Sede", ns)
            contatti = company_node.find(".//p:Contatti", ns)
            
            # Dati fiscali
            id_fiscale = dati_anagrafici.find(".//p:IdFiscaleIVA", ns)
            piva = id_fiscale.find("p:IdCodice", ns).text if id_fiscale is not None else ""
            
            codice_fiscale_node = dati_anagrafici.find("p:CodiceFiscale", ns)
            codice_fiscale = codice_fiscale_node.text if codice_fiscale_node is not None else piva
            
            # Ragione sociale o nome/cognome
            anagrafica = dati_anagrafici.find("p:Anagrafica", ns)
            denominazione_node = anagrafica.find("p:Denominazione", ns)
            
            if denominazione_node is not None:
                ragione_sociale = denominazione_node.text
            else:
                # Se non c'è denominazione, costruisci da nome e cognome
                nome = anagrafica.find("p:Nome", ns)
                cognome = anagrafica.find("p:Cognome", ns)
                if nome is not None and cognome is not None:
                    ragione_sociale = f"{nome.text} {cognome.text}"
                else:
                    ragione_sociale = "Azienda"
            
            # Dati sede
            indirizzo_parts = []
            if sede is not None:
                indirizzo_node = sede.find("p:Indirizzo", ns)
                numero_civico_node = sede.find("p:NumeroCivico", ns)
                
                if indirizzo_node is not None:
                    indirizzo_parts.append(indirizzo_node.text)
                if numero_civico_node is not None:
                    indirizzo_parts.append(numero_civico_node.text)
                
                cap = sede.find("p:CAP", ns)
                comune = sede.find("p:Comune", ns)
                provincia = sede.find("p:Provincia", ns)
                nazione = sede.find("p:Nazione", ns)
            else:
                cap = comune = provincia = nazione = None
            
            # Contatti
            telefono = None
            email = None
            if contatti is not None:
                telefono_node = contatti.find("p:Telefono", ns)
                email_node = contatti.find("p:Email", ns)
                telefono = telefono_node.text if telefono_node is not None else None
                email = email_node.text if email_node is not None else None
            
            # Regime fiscale (utile per configurazioni)
            regime_fiscale_node = dati_anagrafici.find("p:RegimeFiscale", ns)
            regime_fiscale = regime_fiscale_node.text if regime_fiscale_node is not None else "RF01"
            
            return {
                "ragione_sociale": ragione_sociale,
                "partita_iva": piva,
                "codice_fiscale": codice_fiscale,
                "indirizzo": " ".join(indirizzo_parts) if indirizzo_parts else "",
                "cap": cap.text if cap is not None else "",
                "citta": comune.text if comune is not None else "",
                "provincia": provincia.text if provincia is not None else "",
                "paese": nazione.text if nazione is not None else "IT",
                "telefono": telefono,
                "email": email,
                "regime_fiscale": regime_fiscale,
                "codice_destinatario": CompanyDataExtractor._extract_codice_destinatario(root, ns)
            }
            
        except ET.ParseError as e:
            raise ValueError(f"Errore parsing XML: {e}")
        except Exception as e:
            raise ValueError(f"Errore estrazione dati: {e}")
    
    @staticmethod
    def _extract_codice_destinatario(root, ns) -> str:
        """Estrae codice destinatario dalle trasmissioni"""
        try:
            codice_dest = root.find(".//p:CodiceDestinatario", ns)
            return codice_dest.text if codice_dest is not None else ""
        except:
            return ""
    
    @staticmethod
    def validate_partita_iva(piva: str) -> bool:
        """Validazione base P.IVA italiana"""
        if not piva:
            return False
        
        # Rimuovi spazi e caratteri non numerici
        piva = re.sub(r'\D', '', piva)
        
        # Deve essere lunga 11 caratteri
        if len(piva) != 11:
            return False
        
        # Algoritmo di controllo P.IVA italiana semplificato
        try:
            # Somma cifre dispari
            odd_sum = sum(int(piva[i]) for i in range(0, 10, 2))
            
            # Somma cifre pari moltiplicata per 2
            even_sum = 0
            for i in range(1, 10, 2):
                double = int(piva[i]) * 2
                even_sum += double if double < 10 else double - 9
            
            total = odd_sum + even_sum
            check_digit = (10 - (total % 10)) % 10
            
            return int(piva[10]) == check_digit
        except:
            return False


class SetupWizard:
    """Wizard per configurazione iniziale sistema"""
    
    @staticmethod
    def get_current_config() -> Dict[str, Any]:
        """Ottiene configurazione attuale"""
        config_path = "config.ini"
        
        if not Path(config_path).exists():
            return {
                "has_config": False,
                "company_configured": False,
                "api_configured": False,
                "cloud_sync_configured": False
            }
        
        config = configparser.ConfigParser()
        config.read(config_path, encoding='utf-8')
        
        # Check configurazioni
        company_configured = (
            config.has_section('Azienda') and
            config.get('Azienda', 'PartitaIVA', fallback='') != '' and
            config.get('Azienda', 'RagioneSociale', fallback='') != ''
        )
        
        api_configured = (
            config.has_section('API') and
            config.get('API', 'host', fallback='') != ''
        )
        
        cloud_sync_configured = (
            config.has_section('CloudSync') and
            config.get('CloudSync', 'credentials_file', fallback='') != '' and
            Path(config.get('CloudSync', 'credentials_file', fallback='')).exists()
        )
        
        return {
            "has_config": True,
            "company_configured": company_configured,
            "api_configured": api_configured,
            "cloud_sync_configured": cloud_sync_configured,
            "config_sections": list(config.sections()),
            "company_data": dict(config.items('Azienda')) if config.has_section('Azienda') else {}
        }
    
    @staticmethod
    def create_config(company_data: Dict[str, Any], api_settings: Dict[str, Any] = None, 
                     cloud_settings: Dict[str, Any] = None) -> bool:
        """Crea file di configurazione"""
        try:
            config = configparser.ConfigParser()
            
            # Sezione Paths
            config.add_section('Paths')
            config.set('Paths', 'DatabaseFile', 'database.db')
            
            # Sezione Azienda
            config.add_section('Azienda')
            config.set('Azienda', 'RagioneSociale', company_data.get('ragione_sociale', ''))
            config.set('Azienda', 'PartitaIVA', company_data.get('partita_iva', ''))
            config.set('Azienda', 'CodiceFiscale', company_data.get('codice_fiscale', ''))
            config.set('Azienda', 'Indirizzo', company_data.get('indirizzo', ''))
            config.set('Azienda', 'CAP', company_data.get('cap', ''))
            config.set('Azienda', 'Citta', company_data.get('citta', ''))
            config.set('Azienda', 'Provincia', company_data.get('provincia', ''))
            config.set('Azienda', 'Paese', company_data.get('paese', 'IT'))
            config.set('Azienda', 'Telefono', company_data.get('telefono', ''))
            config.set('Azienda', 'Email', company_data.get('email', ''))
            config.set('Azienda', 'CodiceDestinatario', company_data.get('codice_destinatario', ''))
            config.set('Azienda', 'RegimeFiscale', company_data.get('regime_fiscale', 'RF01'))
            
            # Sezione API
            config.add_section('API')
            if api_settings:
                config.set('API', 'host', api_settings.get('host', '127.0.0.1'))
                config.set('API', 'port', str(api_settings.get('port', 8000)))
                config.set('API', 'debug', str(api_settings.get('debug', False)).lower())
                config.set('API', 'cors_origins', api_settings.get('cors_origins', 'tauri://localhost,http://localhost:3000'))
            else:
                config.set('API', 'host', '127.0.0.1')
                config.set('API', 'port', '8000')
                config.set('API', 'debug', 'false')
                config.set('API', 'cors_origins', 'tauri://localhost,http://localhost:3000')
            
            # Sezione CloudSync
            config.add_section('CloudSync')
            if cloud_settings:
                config.set('CloudSync', 'enabled', str(cloud_settings.get('enabled', False)).lower())
                config.set('CloudSync', 'credentials_file', cloud_settings.get('credentials_file', 'google_credentials.json'))
                config.set('CloudSync', 'auto_sync_interval', str(cloud_settings.get('auto_sync_interval', 3600)))
            else:
                config.set('CloudSync', 'enabled', 'false')
                config.set('CloudSync', 'credentials_file', 'google_credentials.json')
                config.set('CloudSync', 'auto_sync_interval', '3600')
            
            # Scrivi file
            with open('config.ini', 'w', encoding='utf-8') as configfile:
                config.write(configfile)
            
            logger.info("Configuration file created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error creating config: {e}")
            return False


@router.get("/status")
async def get_setup_status():
    """Ottiene stato configurazione sistema"""
    try:
        status = SetupWizard.get_current_config()
        
        # Aggiungi informazioni aggiuntive
        status.update({
            "database_exists": Path("database.db").exists() or Path("data/database.db").exists(),
            "google_credentials_exists": Path("google_credentials.json").exists(),
            "setup_required": not (status.get("company_configured", False) and status.get("api_configured", False))
        })
        
        return APIResponse(
            success=True,
            message="Setup status retrieved",
            data=status
        )
        
    except Exception as e:
        logger.error(f"Error getting setup status: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving setup status")


@router.post("/extract-from-invoice")
async def extract_company_data_from_invoice(
    file: UploadFile = File(...),
    invoice_type: str = Form("active")  # "active" o "passive"
):
    """Estrae dati aziendali da fattura XML"""
    try:
        # Validazione file
        if not file.filename.lower().endswith(('.xml', '.p7m')):
            raise HTTPException(status_code=400, detail="File deve essere XML o P7M")
        
        # Leggi contenuto
        content = await file.read()
        
        # Se è P7M, estrai XML (semplificato per ora)
        if file.filename.lower().endswith('.p7m'):
            # Cerca il contenuto XML all'interno del P7M
            content_str = content.decode('utf-8', errors='ignore')
            xml_start = content_str.find('<?xml')
            xml_end = content_str.rfind('</p:FatturaElettronica>')
            
            if xml_start != -1 and xml_end != -1:
                xml_content = content_str[xml_start:xml_end + len('</p:FatturaElettronica>')]
            else:
                raise HTTPException(status_code=400, detail="Contenuto XML non trovato nel file P7M")
        else:
            xml_content = content.decode('utf-8')
        
        # Estrai dati
        company_data = CompanyDataExtractor.extract_from_xml(xml_content, invoice_type)
        
        # Validazioni
        if not CompanyDataExtractor.validate_partita_iva(company_data['partita_iva']):
            company_data['validation_warnings'] = ["Partita IVA potrebbe non essere valida"]
        
        return APIResponse(
            success=True,
            message="Dati aziendali estratti con successo",
            data={
                "company_data": company_data,
                "extraction_source": f"Fattura {invoice_type} - {file.filename}",
                "suggested_config": {
                    "ragione_sociale": company_data['ragione_sociale'],
                    "partita_iva": company_data['partita_iva'],
                    "codice_fiscale": company_data['codice_fiscale'],
                    "indirizzo_completo": f"{company_data['indirizzo']}, {company_data['cap']} {company_data['citta']} ({company_data['provincia']})"
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting company data: {e}")
        raise HTTPException(status_code=500, detail=f"Errore estrazione dati: {str(e)}")


@router.post("/complete")
async def complete_setup(
    company_data: Dict[str, Any],
    api_settings: Optional[Dict[str, Any]] = None,
    cloud_settings: Optional[Dict[str, Any]] = None,
    create_sample_data: bool = False
):
    """Completa setup iniziale"""
    try:
        # Validazioni
        required_fields = ['ragione_sociale', 'partita_iva']
        missing_fields = [field for field in required_fields if not company_data.get(field)]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Campi obbligatori mancanti: {', '.join(missing_fields)}"
            )
        
        # Valida P.IVA
        if not CompanyDataExtractor.validate_partita_iva(company_data['partita_iva']):
            raise HTTPException(status_code=400, detail="Partita IVA non valida")
        
        # Crea configurazione
        success = SetupWizard.create_config(company_data, api_settings, cloud_settings)
        if not success:
            raise HTTPException(status_code=500, detail="Errore creazione configurazione")
        
        # Setup database
        from app.adapters.database_adapter import db_adapter
        await db_adapter.create_tables_async()
        
        # Crea anagrafica della propria azienda
        our_company = {
            "type": "Azienda",
            "denomination": company_data['ragione_sociale'],
            "piva": company_data['partita_iva'],
            "cf": company_data.get('codice_fiscale', company_data['partita_iva']),
            "address": company_data.get('indirizzo', ''),
            "cap": company_data.get('cap', ''),
            "city": company_data.get('citta', ''),
            "province": company_data.get('provincia', ''),
            "country": company_data.get('paese', 'IT'),
            "email": company_data.get('email', ''),
            "phone": company_data.get('telefono', ''),
            "codice_destinatario": company_data.get('codice_destinatario', '')
        }
        
        our_company_id = await db_adapter.add_anagraphics_async(our_company, "Azienda")
        
        # Genera dati di esempio se richiesto
        if create_sample_data:
            try:
                from scripts.generate_sample_data import generate_anagraphics, generate_invoices, generate_transactions
                await generate_anagraphics()
                await generate_invoices()
                await generate_transactions()
                logger.info("Sample data generated successfully")
            except Exception as e:
                logger.warning(f"Error generating sample data: {e}")
        
        # Ricarica configurazione
        from app.config import settings
        settings.load_config()
        
        return APIResponse(
            success=True,
            message="Setup completato con successo!",
            data={
                "config_created": True,
                "database_initialized": True,
                "company_id": our_company_id,
                "sample_data_created": create_sample_data,
                "next_steps": [
                    "Il sistema è ora configurato e pronto per l'uso",
                    "Puoi iniziare importando fatture XML o transazioni CSV",
                    "Controlla la dashboard per vedere i KPI aziendali",
                    "Configura la sincronizzazione cloud se necessaria"
                ]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing setup: {e}")
        raise HTTPException(status_code=500, detail=f"Errore completamento setup: {str(e)}")


@router.post("/validate-company-data")
async def validate_company_data(company_data: Dict[str, Any]):
    """Valida dati aziendali inseriti"""
    try:
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": []
        }
        
        # Validazioni obbligatorie
        if not company_data.get('ragione_sociale'):
            validation_results['errors'].append("Ragione sociale è obbligatoria")
            validation_results['valid'] = False
        
        if not company_data.get('partita_iva'):
            validation_results['errors'].append("Partita IVA è obbligatoria")
            validation_results['valid'] = False
        elif not CompanyDataExtractor.validate_partita_iva(company_data['partita_iva']):
            validation_results['errors'].append("Partita IVA non valida")
            validation_results['valid'] = False
        
        # Validazioni opzionali con warnings
        if not company_data.get('codice_fiscale'):
            validation_results['warnings'].append("Codice Fiscale non fornito, sarà usata la P.IVA")
            validation_results['suggestions'].append("Inserire il Codice Fiscale se diverso dalla P.IVA")
        
        if not company_data.get('email'):
            validation_results['warnings'].append("Email non fornita")
            validation_results['suggestions'].append("Inserire email per notifiche e comunicazioni")
        
        if not company_data.get('indirizzo'):
            validation_results['warnings'].append("Indirizzo non fornito")
            validation_results['suggestions'].append("Inserire indirizzo completo per fatturazione")
        
        # Validazione email se fornita
        email = company_data.get('email')
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            validation_results['warnings'].append("Formato email potrebbe non essere valido")
        
        return APIResponse(
            success=True,
            message="Validazione completata",
            data=validation_results
        )
        
    except Exception as e:
        logger.error(f"Error validating company data: {e}")
        raise HTTPException(status_code=500, detail="Errore validazione dati")


@router.get("/import-suggestions")
async def get_import_suggestions():
    """Suggerimenti per importazione dati"""
    return APIResponse(
        success=True,
        message="Suggerimenti importazione",
        data={
            "file_types": {
                "invoices": {
                    "supported_formats": [".xml", ".p7m"],
                    "description": "Fatture elettroniche in formato XML o P7M",
                    "examples": ["IT01234567890_001.xml", "fattura_elettronica.xml.p7m"]
                },
                "transactions": {
                    "supported_formats": [".csv"],
                    "description": "Movimenti bancari in formato CSV",
                    "examples": ["estratto_conto.csv", "movimenti_gennaio.csv"],
                    "required_columns": ["DATA", "IMPORTO", "DESCRIZIONE"],
                    "optional_columns": ["VALUTA", "DARE", "AVERE", "CAUSALE_ABI"]
                }
            },
            "best_practices": [
                "Inizia caricando una fattura attiva per estrarre i dati aziendali",
                "Importa prima le anagrafiche, poi le fatture",
                "Carica i movimenti bancari per abilitare la riconciliazione",
                "Verifica sempre i dati estratti prima di confermare"
            ],
            "common_issues": [
                "File P7M: assicurati che contenga XML valido",
                "CSV: usa il separatore ';' per migliori risultati",
                "Encoding: preferisci UTF-8 per caratteri speciali",
                "Date: formato preferito YYYY-MM-DD o DD/MM/YYYY"
            ]
        }
    )


# Test endpoint per sviluppo
@router.post("/test-xml-extraction")
async def test_xml_extraction(xml_content: str = Form(...), invoice_type: str = Form("active")):
    """Endpoint di test per estrazione XML (solo sviluppo)"""
    try:
        company_data = CompanyDataExtractor.extract_from_xml(xml_content, invoice_type)
        return APIResponse(
            success=True,
            message="Test estrazione completato",
            data=company_data
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
