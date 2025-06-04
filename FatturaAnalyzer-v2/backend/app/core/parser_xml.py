# core/parser_xml.py - Versione migliorata per gestire meglio le fatture passive

from lxml import etree
import logging
import os
import re
from decimal import Decimal
from datetime import datetime

try:
    from .utils import calculate_invoice_hash, to_decimal, quantize, _is_own_company
except ImportError:
    logging.warning("Import relativo .utils fallito in parser_xml.py, tento import assoluto.")
    from utils import calculate_invoice_hash, to_decimal, quantize, _is_own_company

logger = logging.getLogger(__name__)

# === FUNZIONI HELPER XPATH MIGLIORATE ===
def xpath_get_text_robust(element, queries, default="", normalize_space=True, log_attempts=False):
    """
    Versione robusta che prova multiple query XPath per lo stesso dato.
    Utile quando i fornitori usano strutture XML diverse.
    """
    if element is None:
        return default
    
    # Se queries è una stringa, convertila in lista
    if isinstance(queries, str):
        queries = [queries]
    
    for i, query in enumerate(queries):
        try:
            result = element.xpath(query)
            if result:
                text_content = None
                if hasattr(result[0], 'text') and result[0].text is not None:
                    text_content = result[0].text
                elif isinstance(result[0], str):
                    text_content = result[0]
                
                if text_content is not None and text_content.strip():
                    final_text = ' '.join(text_content.split()) if normalize_space else text_content.strip()
                    if log_attempts:
                        logger.debug(f"XPath query {i+1}/{len(queries)} successo: '{query}' -> '{final_text}'")
                    return final_text
        except Exception as e:
            if log_attempts:
                logger.debug(f"XPath query {i+1}/{len(queries)} fallita: '{query}' -> {e}")
            continue
    
    if log_attempts and len(queries) > 1:
        logger.warning(f"Tutte le {len(queries)} query XPath fallite. Uso default: '{default}'")
    
    return default

def xpath_get_text(element, query, default="", normalize_space=True):
    """Versione originale mantenuta per compatibilità"""
    return xpath_get_text_robust(element, [query], default, normalize_space)

def xpath_find_first(element, query):
    if element is None: 
        return None
    try: 
        result = element.xpath(query)
        return result[0] if result else None
    except Exception as e: 
        logger.debug(f"Err xpath '{query}': {e}")
        return None

def xpath_find_all(element, query):
    if element is None: 
        return []
    try: 
        return element.xpath(query)
    except Exception as e: 
        logger.debug(f"Err xpath '{query}': {e}")
        return []

def xpath_get_decimal_robust(element, queries, default_str='0.0', log_attempts=False):
    """
    Versione robusta per estrazione valori decimali con multiple query.
    Gestisce meglio i formati numerici diversi dei vari fornitori.
    """
    text = xpath_get_text_robust(element, queries, default="", log_attempts=log_attempts)
    cleaned_text = text.strip()
    
    if not cleaned_text:
        return to_decimal(default_str)
    
    # Controllo pattern data per evitare conversioni errate
    date_pattern = r'^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{8})$'
    if re.match(date_pattern, cleaned_text):
        if re.search(r'[-/]', cleaned_text) or ('.' in cleaned_text and not cleaned_text.replace('.','').isdigit()):
            logger.warning(f"Campo numerico contiene pattern data: '{text}'. Uso default '{default_str}'.")
            return to_decimal(default_str)
    
    # Pulizia speciale per importi con formati diversi
    cleaned_for_decimal = clean_amount_string(cleaned_text)
    result = to_decimal(cleaned_for_decimal, default=default_str)
    
    if log_attempts:
        logger.debug(f"Conversione decimale: '{text}' -> '{cleaned_for_decimal}' -> {result}")
    
    return result

def clean_amount_string(amount_str):
    """
    Pulisce stringhe di importo gestendo diversi formati europei/italiani.
    Es: "1.234,56" -> "1234.56", "1,234.56" -> "1234.56", "1 234,56" -> "1234.56"
    """
    if not amount_str:
        return "0.0"
    
    # Rimuovi spazi e caratteri non numerici eccetto . , + -
    cleaned = re.sub(r'[^\d.,-]', '', amount_str.strip())
    
    # Gestisci formato italiano (1.234,56) vs americano (1,234.56)
    if ',' in cleaned and '.' in cleaned:
        # Se abbiamo sia virgola che punto, determina quale è il separatore decimale
        comma_pos = cleaned.rfind(',')
        dot_pos = cleaned.rfind('.')
        
        if comma_pos > dot_pos:
            # Formato italiano: punto=migliaia, virgola=decimali
            cleaned = cleaned.replace('.', '').replace(',', '.')
        else:
            # Formato americano: virgola=migliaia, punto=decimali
            cleaned = cleaned.replace(',', '')
    elif ',' in cleaned:
        # Solo virgola - potrebbe essere decimale italiano o migliaia americane
        comma_parts = cleaned.split(',')
        if len(comma_parts) == 2 and len(comma_parts[1]) <= 2:
            # Probabilmente decimale italiano
            cleaned = cleaned.replace(',', '.')
        else:
            # Probabilmente migliaia, rimuovi virgole
            cleaned = cleaned.replace(',', '')
    
    return cleaned if cleaned else "0.0"

# === FUNZIONI DI ESTRAZIONE ANAGRAFICHE MIGLIORATE ===
def extract_anagraphics_robust(node, entity_type):
    """
    Estrazione anagrafica più robusta che gestisce variazioni nella struttura XML
    di diversi fornitori.
    """
    anag_data = {}
    if node is None: 
        return anag_data

    # Prova diversi percorsi per DatiAnagrafici
    dati_anag_queries = [
        ".//*[local-name()='DatiAnagrafici']",
        "./*[local-name()='DatiAnagrafici']",
        ".//*[contains(local-name(), 'DatiAnag')]"
    ]
    
    dati_anag_node = None
    for query in dati_anag_queries:
        dati_anag_node = xpath_find_first(node, query)
        if dati_anag_node is not None:
            break
    
    if dati_anag_node is not None:
        # Estrazione P.IVA con percorsi multipli
        piva_queries = [
            ".//*[local-name()='IdFiscaleIVA']/*[local-name()='IdCodice']/text()",
            "./*[local-name()='IdFiscaleIVA']/*[local-name()='IdCodice']/text()",
            ".//*[local-name()='IdCodice']/text()",
            "./*[local-name()='IdCodice']/text()"
        ]
        anag_data['piva'] = xpath_get_text_robust(dati_anag_node, piva_queries, log_attempts=True)
        
        # Paese P.IVA
        paese_queries = [
            ".//*[local-name()='IdFiscaleIVA']/*[local-name()='IdPaese']/text()",
            "./*[local-name()='IdFiscaleIVA']/*[local-name()='IdPaese']/text()",
            ".//*[local-name()='IdPaese']/text()",
            "./*[local-name()='IdPaese']/text()"
        ]
        anag_data['piva_paese'] = xpath_get_text_robust(dati_anag_node, paese_queries, default='IT')

        # Codice Fiscale
        cf_queries = [
            ".//*[local-name()='CodiceFiscale']/text()",
            "./*[local-name()='CodiceFiscale']/text()",
            ".//*[contains(local-name(), 'CodiceFisc')]/text()"
        ]
        anag_data['cf'] = xpath_get_text_robust(dati_anag_node, cf_queries, log_attempts=True)

        # Logica di fallback P.IVA/CF migliorata
        piva_val = anag_data.get('piva', '').strip()
        cf_val = anag_data.get('cf', '').strip()
        
        if not piva_val and cf_val: 
            anag_data['piva'] = cf_val
        elif piva_val and not cf_val and len(piva_val) == 16: 
            anag_data['cf'] = piva_val

        # Denominazione con percorsi multipli
        denominazione_queries = [
            ".//*[local-name()='Anagrafica']/*[local-name()='Denominazione']/text()",
            "./*[local-name()='Anagrafica']/*[local-name()='Denominazione']/text()",
            ".//*[local-name()='Denominazione']/text()",
            "./*[local-name()='Denominazione']/text()"
        ]
        anag_data['denomination'] = xpath_get_text_robust(dati_anag_node, denominazione_queries, log_attempts=True)
        
        # Se denominazione vuota, prova con Nome/Cognome
        if not anag_data.get('denomination'):
            nome_queries = [
                ".//*[local-name()='Anagrafica']/*[local-name()='Nome']/text()",
                "./*[local-name()='Anagrafica']/*[local-name()='Nome']/text()",
                ".//*[local-name()='Nome']/text()"
            ]
            cognome_queries = [
                ".//*[local-name()='Anagrafica']/*[local-name()='Cognome']/text()",
                "./*[local-name()='Anagrafica']/*[local-name()='Cognome']/text()",
                ".//*[local-name()='Cognome']/text()"
            ]
            
            nome = xpath_get_text_robust(dati_anag_node, nome_queries)
            cognome = xpath_get_text_robust(dati_anag_node, cognome_queries)
            
            if nome or cognome:
                anag_data['denomination'] = f"{cognome} {nome}".strip()

        if not anag_data.get('denomination'): 
            anag_data['denomination'] = "N/D"

        # Regime fiscale per cedente
        if entity_type == 'Cedente':
            regime_queries = [
                ".//*[local-name()='RegimeFiscale']/text()",
                "./*[local-name()='RegimeFiscale']/text()",
                ".//*[contains(local-name(), 'Regime')]/text()"
            ]
            anag_data['regime_fiscale'] = xpath_get_text_robust(dati_anag_node, regime_queries)

    # Estrazione indirizzo con percorsi multipli
    sede_queries = [
        ".//*[local-name()='Sede']",
        "./*[local-name()='Sede']",
        ".//*[contains(local-name(), 'Sede')]"
    ]
    
    sede_node = None
    for query in sede_queries:
        sede_node = xpath_find_first(node, query)
        if sede_node is not None:
            break
    
    if sede_node is not None:
        address_queries = [
            ".//*[local-name()='Indirizzo']/text()",
            "./*[local-name()='Indirizzo']/text()"
        ]
        anag_data['address'] = xpath_get_text_robust(sede_node, address_queries)
        
        cap_queries = [
            ".//*[local-name()='CAP']/text()",
            "./*[local-name()='CAP']/text()"
        ]
        anag_data['cap'] = xpath_get_text_robust(sede_node, cap_queries)
        
        city_queries = [
            ".//*[local-name()='Comune']/text()",
            "./*[local-name()='Comune']/text()"
        ]
        anag_data['city'] = xpath_get_text_robust(sede_node, city_queries)
        
        province_queries = [
            ".//*[local-name()='Provincia']/text()",
            "./*[local-name()='Provincia']/text()"
        ]
        anag_data['province'] = xpath_get_text_robust(sede_node, province_queries)
        
        country_queries = [
            ".//*[local-name()='Nazione']/text()",
            "./*[local-name()='Nazione']/text()"
        ]
        anag_data['country'] = xpath_get_text_robust(sede_node, country_queries, default='IT')

    # Contatti per cedente
    if entity_type == 'Cedente':
        contatti_queries = [
            ".//*[local-name()='Contatti']",
            "./*[local-name()='Contatti']"
        ]
        
        contatti_node = None
        for query in contatti_queries:
            contatti_node = xpath_find_first(node, query)
            if contatti_node is not None:
                break
        
        if contatti_node is not None:
            email_queries = [
                ".//*[local-name()='Email']/text()",
                "./*[local-name()='Email']/text()"
            ]
            anag_data['email'] = xpath_get_text_robust(contatti_node, email_queries)
            
            phone_queries = [
                ".//*[local-name()='Telefono']/text()",
                "./*[local-name()='Telefono']/text()"
            ]
            anag_data['phone'] = xpath_get_text_robust(contatti_node, phone_queries)
    
    return anag_data

# === ESTRAZIONE DATI GENERALI DOCUMENTO MIGLIORATA ===
def extract_general_document_data_robust(dati_generali_doc_node, base_filename):
    """
    Estrazione dati generali documento più robusta per gestire
    variazioni strutturali dei diversi fornitori.
    """
    if dati_generali_doc_node is None:
        raise ValueError("Blocco DatiGeneraliDocumento non trovato.")
    
    # Tipo documento con percorsi multipli
    doc_type_queries = [
        ".//*[local-name()='TipoDocumento']/text()",
        "./*[local-name()='TipoDocumento']/text()",
        ".//*[contains(local-name(), 'TipoDoc')]/text()"
    ]
    doc_type = xpath_get_text_robust(dati_generali_doc_node, doc_type_queries, log_attempts=True)
    
    # Divisa
    currency_queries = [
        ".//*[local-name()='Divisa']/text()",
        "./*[local-name()='Divisa']/text()"
    ]
    doc_currency = xpath_get_text_robust(dati_generali_doc_node, currency_queries, default='EUR')
    
    # Data documento
    date_queries = [
        ".//*[local-name()='Data']/text()",
        "./*[local-name()='Data']/text()",
        ".//*[contains(local-name(), 'DataDoc')]/text()"
    ]
    doc_date_str = xpath_get_text_robust(dati_generali_doc_node, date_queries, log_attempts=True)
    
    # Numero documento
    number_queries = [
        ".//*[local-name()='Numero']/text()",
        "./*[local-name()='Numero']/text()",
        ".//*[contains(local-name(), 'NumDoc')]/text()",
        ".//*[contains(local-name(), 'NumeroDoc')]/text()"
    ]
    doc_number = xpath_get_text_robust(dati_generali_doc_node, number_queries, log_attempts=True)
    
    # Importo totale documento con percorsi multipli
    total_amount_queries = [
        ".//*[local-name()='ImportoTotaleDocumento']/text()",
        "./*[local-name()='ImportoTotaleDocumento']/text()",
        ".//*[contains(local-name(), 'ImportoTotale')]/text()",
        ".//*[contains(local-name(), 'TotaleDoc')]/text()"
    ]
    doc_total_amount = xpath_get_decimal_robust(
        dati_generali_doc_node, 
        total_amount_queries, 
        default_str='0.0',
        log_attempts=True
    )
    
    # Validazione dati essenziali
    if not doc_date_str or not doc_number:
        raise ValueError(f"Data ('{doc_date_str}') o Numero ('{doc_number}') Documento mancanti in {base_filename}.")
    
    # Validazione formato data
    try:
        datetime.strptime(doc_date_str, '%Y-%m-%d')
    except ValueError:
        try:
            # Prova altri formati comuni
            for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d']:
                datetime.strptime(doc_date_str, fmt)
                break
        except ValueError:
            logger.warning(f"Formato data documento non standard: '{doc_date_str}' in {base_filename}")
    
    return {
        'doc_type': doc_type,
        'currency': doc_currency,
        'doc_date': doc_date_str,
        'doc_number': doc_number,
        'total_amount': doc_total_amount
    }

# === ESTRAZIONE RIGHE DOCUMENTO MIGLIORATA ===
def extract_document_lines_robust(dati_beni_servizi_node, base_filename):
    """
    Estrazione righe documento più robusta per gestire
    variazioni strutturali nei DettaglioLinee.
    """
    lines_data = []
    
    if dati_beni_servizi_node is None:
        logger.warning(f"Blocco DatiBeniServizi non trovato in {base_filename}")
        return lines_data
    
    # Cerca DettaglioLinee con percorsi multipli
    line_queries = [
        ".//*[local-name()='DettaglioLinee']",
        "./*[local-name()='DettaglioLinee']",
        ".//*[contains(local-name(), 'DettaglioLinee')]",
        ".//*[contains(local-name(), 'Linea')]"
    ]
    
    line_nodes = []
    for query in line_queries:
        line_nodes = xpath_find_all(dati_beni_servizi_node, query)
        if line_nodes:
            break
    
    logger.debug(f"Trovate {len(line_nodes)} righe in {base_filename}")
    
    for idx, line_node in enumerate(line_nodes):
        try:
            # Numero linea
            line_num_queries = [
                ".//*[local-name()='NumeroLinea']/text()",
                "./*[local-name()='NumeroLinea']/text()",
                ".//*[contains(local-name(), 'NumLinea')]/text()"
            ]
            line_num_text = xpath_get_text_robust(line_node, line_num_queries, default=str(idx + 1))
            
            try:
                line_num = int(line_num_text)
            except ValueError:
                line_num = idx + 1

            # Codice articolo
            item_code_queries = [
                ".//*[local-name()='CodiceArticolo']/*[local-name()='CodiceValore']/text()",
                "./*[local-name()='CodiceArticolo']/*[local-name()='CodiceValore']/text()",
                ".//*[local-name()='CodiceValore']/text()"
            ]
            item_code = xpath_get_text_robust(line_node, item_code_queries)
            
            # Tipo codice articolo
            item_type_queries = [
                ".//*[local-name()='CodiceArticolo']/*[local-name()='CodiceTipo']/text()",
                "./*[local-name()='CodiceArticolo']/*[local-name()='CodiceTipo']/text()",
                ".//*[local-name()='CodiceTipo']/text()"
            ]
            item_type = xpath_get_text_robust(line_node, item_type_queries)
            
            # Descrizione
            description_queries = [
                ".//*[local-name()='Descrizione']/text()",
                "./*[local-name()='Descrizione']/text()",
                ".//*[contains(local-name(), 'Desc')]/text()"
            ]
            description = xpath_get_text_robust(line_node, description_queries, log_attempts=True)
            
            # Unità di misura
            unit_measure_queries = [
                ".//*[local-name()='UnitaMisura']/text()",
                "./*[local-name()='UnitaMisura']/text()",
                ".//*[contains(local-name(), 'Unita')]/text()"
            ]
            unit_measure = xpath_get_text_robust(line_node, unit_measure_queries)
            
            # Quantità
            quantity_queries = [
                ".//*[local-name()='Quantita']/text()",
                "./*[local-name()='Quantita']/text()",
                ".//*[contains(local-name(), 'Qta')]/text()",
                ".//*[contains(local-name(), 'Qty')]/text()"
            ]
            quantity = xpath_get_decimal_robust(line_node, quantity_queries, default_str='NaN', log_attempts=True)
            
            # Prezzo unitario
            unit_price_queries = [
                ".//*[local-name()='PrezzoUnitario']/text()",
                "./*[local-name()='PrezzoUnitario']/text()",
                ".//*[contains(local-name(), 'PrezzoUnit')]/text()",
                ".//*[contains(local-name(), 'Prezzo')]/text()"
            ]
            unit_price = xpath_get_decimal_robust(line_node, unit_price_queries, default_str='0.0', log_attempts=True)
            
            # Prezzo totale riga
            total_price_queries = [
                ".//*[local-name()='PrezzoTotale']/text()",
                "./*[local-name()='PrezzoTotale']/text()",
                ".//*[contains(local-name(), 'PrezzoTot')]/text()",
                ".//*[contains(local-name(), 'ImportoLinea')]/text()",
                ".//*[contains(local-name(), 'TotaleLinea')]/text()"
            ]
            total_price = xpath_get_decimal_robust(line_node, total_price_queries, default_str='0.0', log_attempts=True)
            
            # Aliquota IVA
            vat_rate_queries = [
                ".//*[local-name()='AliquotaIVA']/text()",
                "./*[local-name()='AliquotaIVA']/text()",
                ".//*[contains(local-name(), 'Aliquota')]/text()",
                ".//*[contains(local-name(), 'IVA')]/text()"
            ]
            vat_rate = xpath_get_decimal_robust(line_node, vat_rate_queries, default_str='0.0', log_attempts=True)
            
            # Validazione quantità
            if not quantity.is_finite():
                quantity = None
            
            # Calcolo automatico prezzo totale se mancante ma abbiamo quantità e prezzo unitario
            if total_price == Decimal('0.0') and quantity and unit_price and quantity.is_finite():
                calculated_total = quantize(quantity * unit_price)
                logger.info(f"Calcolato prezzo totale riga {line_num}: {quantity} x {unit_price} = {calculated_total}")
                total_price = calculated_total
            
            line_data = {
                'line_number': line_num,
                'item_code': item_code,
                'item_type': item_type,
                'description': description,
                'unit_measure': unit_measure,
                'quantity': quantity,
                'unit_price': unit_price,
                'total_price': total_price,
                'vat_rate': vat_rate
            }
            
            lines_data.append(line_data)
            
        except Exception as line_err:
            logger.error(f"Errore estrazione riga {idx+1} in {base_filename}: {line_err}")
            continue
    
    return lines_data

# === ESTRAZIONE RIEPILOGO IVA MIGLIORATA ===
def extract_vat_summary_robust(dati_beni_servizi_node, base_filename):
    """
    Estrazione riepilogo IVA più robusta.
    """
    vat_summary_data = []
    
    if dati_beni_servizi_node is None:
        return vat_summary_data
    
    # Cerca DatiRiepilogo con percorsi multipli
    riepilogo_queries = [
        ".//*[local-name()='DatiRiepilogo']",
        "./*[local-name()='DatiRiepilogo']",
        ".//*[contains(local-name(), 'Riepilogo')]"
    ]
    
    riepilogo_nodes = []
    for query in riepilogo_queries:
        riepilogo_nodes = xpath_find_all(dati_beni_servizi_node, query)
        if riepilogo_nodes:
            break
    
    logger.debug(f"Trovati {len(riepilogo_nodes)} blocchi riepilogo IVA in {base_filename}")
    
    for riep_node in riepilogo_nodes:
        try:
            # Aliquota IVA
            vat_rate_queries = [
                ".//*[local-name()='AliquotaIVA']/text()",
                "./*[local-name()='AliquotaIVA']/text()",
                ".//*[contains(local-name(), 'Aliquota')]/text()"
            ]
            vat_rate = xpath_get_decimal_robust(riep_node, vat_rate_queries, '0.0', log_attempts=True)
            
            # Imponibile
            taxable_queries = [
                ".//*[local-name()='ImponibileImporto']/text()",
                "./*[local-name()='ImponibileImporto']/text()",
                ".//*[contains(local-name(), 'Imponibile')]/text()",
                ".//*[contains(local-name(), 'TaxableAmount')]/text()"
            ]
            taxable_amount = xpath_get_decimal_robust(riep_node, taxable_queries, '0.0', log_attempts=True)
            
            # Imposta
            vat_amount_queries = [
                ".//*[local-name()='Imposta']/text()",
                "./*[local-name()='Imposta']/text()",
                ".//*[contains(local-name(), 'ImportoIVA')]/text()",
                ".//*[contains(local-name(), 'TaxAmount')]/text()"
            ]
            vat_amount = xpath_get_decimal_robust(riep_node, vat_amount_queries, '0.0', log_attempts=True)
            
            # Esigibilità IVA
            esigibilita_queries = [
                ".//*[local-name()='EsigibilitaIVA']/text()",
                "./*[local-name()='EsigibilitaIVA']/text()",
                ".//*[contains(local-name(), 'Esigibilita')]/text()"
            ]
            esigibilita = xpath_get_text_robust(riep_node, esigibilita_queries)
            
            vat_summary = {
                'vat_rate': vat_rate,
                'taxable_amount': taxable_amount,
                'vat_amount': vat_amount,
                'esigibilita': esigibilita
            }
            
            vat_summary_data.append(vat_summary)
            
        except Exception as vat_err:
            logger.error(f"Errore estrazione riepilogo IVA in {base_filename}: {vat_err}")
            continue
    
    return vat_summary_data

# === FUNZIONE PRINCIPALE PARSE_FATTURA_XML MIGLIORATA ===
def parse_fattura_xml(xml_filepath, my_company_data=None):
    """
    Parser XML migliorato per gestire meglio le variazioni strutturali
    delle fatture passive di diversi fornitori.
    """
    base_filename = os.path.basename(xml_filepath)
    logger.info(f"Parsing XML migliorato: {base_filename}")
    
    if my_company_data is None:
        logger.error(f"Dati azienda mancanti per parse_fattura_xml ({base_filename}).")
        return {'error': "Dati azienda mancanti", 'source_file': xml_filepath}

    try:
        # Parser XML più permissivo per gestire XML malformati
        parser = etree.XMLParser(
            recover=True,           # Recupera da errori XML
            remove_blank_text=True,
            remove_comments=True,
            remove_pis=True,
            no_network=True,
            huge_tree=True,
            encoding='utf-8'        # Forza encoding
        )
        
        tree = etree.parse(xml_filepath, parser)
        root = tree.getroot()
        
        if root is None:
            raise ValueError("Root element non trovato.")

        # Trova i nodi principali con ricerca più robusta
        header_queries = [
            "//*[local-name()='FatturaElettronicaHeader']",
            "//*[contains(local-name(), 'Header')]",
            "//*[contains(local-name(), 'Intestazione')]"
        ]
        
        body_queries = [
            "//*[local-name()='FatturaElettronicaBody']",
            "//*[contains(local-name(), 'Body')]",
            "//*[contains(local-name(), 'Corpo')]"
        ]
        
        header_node = None
        for query in header_queries:
            header_node = xpath_find_first(root, query)
            if header_node is not None:
                break
        
        body_node = None
        for query in body_queries:
            body_node = xpath_find_first(root, query)
            if body_node is not None:
                break
        
        if header_node is None:
            raise ValueError("Blocco FatturaElettronicaHeader non trovato.")
        if body_node is None:
            raise ValueError("Blocco FatturaElettronicaBody non trovato.")

        # Struttura dati di ritorno
        data = {
            'header': {}, 
            'body': {
                'general_data': {}, 
                'lines': [], 
                'vat_summary': [], 
                'payment_data': []
            },
            'source_file': xml_filepath, 
            'anagraphics': {'cedente': {}, 'cessionario': {}},
            'type': 'Unknown', 
            'unique_hash': None, 
            'error': None
        }

        # === ESTRAZIONE ANAGRAFICHE MIGLIORATE ===
        
        # Cedente con percorsi multipli
        cedente_queries = [
            ".//*[local-name()='CedentePrestatore']",
            "./*[local-name()='CedentePrestatore']",
            ".//*[contains(local-name(), 'Cedente')]",
            ".//*[contains(local-name(), 'Prestatore')]"
        ]
        
        cedente_node = None
        for query in cedente_queries:
            cedente_node = xpath_find_first(header_node, query)
            if cedente_node is not None:
                break
        
        # Cessionario con percorsi multipli
        cessionario_queries = [
            ".//*[local-name()='CessionarioCommittente']",
            "./*[local-name()='CessionarioCommittente']",
            ".//*[contains(local-name(), 'Cessionario')]",
            ".//*[contains(local-name(), 'Committente')]"
        ]
        
        cessionario_node = None
        for query in cessionario_queries:
            cessionario_node = xpath_find_first(header_node, query)
            if cessionario_node is not None:
                break

        if cedente_node is None:
            raise ValueError("Blocco CedentePrestatore non trovato.")
        if cessionario_node is None:
            raise ValueError("Blocco CessionarioCommittente non trovato.")

        # Estrai anagrafiche con funzione robusta
        data['anagraphics']['cedente'] = extract_anagraphics_robust(cedente_node, 'Cedente')
        data['anagraphics']['cessionario'] = extract_anagraphics_robust(cessionario_node, 'Cessionario')

        # Dati trasmissione
        dati_trasmissione_queries = [
            ".//*[local-name()='DatiTrasmissione']",
            "./*[local-name()='DatiTrasmissione']",
            ".//*[contains(local-name(), 'Trasmissione')]"
        ]
        
        dati_trasmissione = None
        for query in dati_trasmissione_queries:
            dati_trasmissione = xpath_find_first(header_node, query)
            if dati_trasmissione is not None:
                break
        
        if dati_trasmissione:
            # Codice destinatario
            cod_dest_queries = [
                ".//*[local-name()='CodiceDestinatario']/text()",
                "./*[local-name()='CodiceDestinatario']/text()",
                ".//*[contains(local-name(), 'CodDest')]/text()"
            ]
            data['anagraphics']['cessionario']['codice_destinatario'] = xpath_get_text_robust(
                dati_trasmissione, cod_dest_queries
            )
            
            # PEC destinatario
            pec_dest_queries = [
                ".//*[local-name()='PECDestinatario']/text()",
                "./*[local-name()='PECDestinatario']/text()",
                ".//*[contains(local-name(), 'PEC')]/text()"
            ]
            data['anagraphics']['cessionario']['pec'] = xpath_get_text_robust(
                dati_trasmissione, pec_dest_queries
            )

        # === DETERMINAZIONE TIPO FATTURA ===
        ced_anag = data['anagraphics']['cedente']
        ces_anag = data['anagraphics']['cessionario']
        
        is_cedente_us = _is_own_company(ced_anag, my_company_data)
        is_cessionario_us = _is_own_company(ces_anag, my_company_data)

        if is_cedente_us and is_cessionario_us:
            data['type'] = 'Autofattura'
        elif is_cedente_us:
            data['type'] = 'Attiva'
        elif is_cessionario_us:
            data['type'] = 'Passiva'
        else:
            logger.error(f"Tipo fattura non determinato per {base_filename}. Dati azienda config non corrispondono.")
            data['type'] = 'Unknown'

        logger.info(f"Tipo fattura determinato: {data['type']}")

        # === ESTRAZIONE DATI GENERALI DOCUMENTO ===
        dati_generali_queries = [
            ".//*[local-name()='DatiGenerali']",
            "./*[local-name()='DatiGenerali']",
            ".//*[contains(local-name(), 'DatiGen')]"
        ]
        
        dati_generali_node = None
        for query in dati_generali_queries:
            dati_generali_node = xpath_find_first(body_node, query)
            if dati_generali_node is not None:
                break
        
        if dati_generali_node is None:
            raise ValueError("Blocco DatiGenerali non trovato.")
        
        dati_generali_doc_queries = [
            ".//*[local-name()='DatiGeneraliDocumento']",
            "./*[local-name()='DatiGeneraliDocumento']",
            ".//*[contains(local-name(), 'DatiGeneraliDoc')]"
        ]
        
        dati_generali_doc_node = None
        for query in dati_generali_doc_queries:
            dati_generali_doc_node = xpath_find_first(dati_generali_node, query)
            if dati_generali_doc_node is not None:
                break
        
        # Estrai dati generali con funzione robusta
        general_data = extract_general_document_data_robust(dati_generali_doc_node, base_filename)
        data['body']['general_data'] = general_data

        # === CALCOLO HASH UNIVOCO ===
        hash_cedente_id = ced_anag.get('piva') or ced_anag.get('cf') or ""
        hash_cessionario_id = ces_anag.get('piva') or ces_anag.get('cf') or ""
        
        if not hash_cedente_id or not hash_cessionario_id:
            logger.warning(f"P.IVA/CF mancante per hash fattura '{general_data['doc_number']}'.")
        
        data['unique_hash'] = calculate_invoice_hash(
            hash_cedente_id, 
            hash_cessionario_id, 
            general_data['doc_type'], 
            general_data['doc_number'], 
            general_data['doc_date']
        )
        logger.debug(f"Hash calcolato: {data['unique_hash']}")

        # === ESTRAZIONE DATI BENI SERVIZI (RIGHE E IVA) ===
        dati_beni_servizi_queries = [
            ".//*[local-name()='DatiBeniServizi']",
            "./*[local-name()='DatiBeniServizi']",
            ".//*[contains(local-name(), 'BeniServizi')]"
        ]
        
        dati_beni_servizi_node = None
        for query in dati_beni_servizi_queries:
            dati_beni_servizi_node = xpath_find_first(body_node, query)
            if dati_beni_servizi_node is not None:
                break
        
        if dati_beni_servizi_node:
            # Estrai righe con funzione robusta
            data['body']['lines'] = extract_document_lines_robust(dati_beni_servizi_node, base_filename)
            
            # Estrai riepilogo IVA con funzione robusta
            data['body']['vat_summary'] = extract_vat_summary_robust(dati_beni_servizi_node, base_filename)
            
            # Validazione e ricalcolo totale da riepilogo IVA
            calculated_total_from_vat = Decimal('0.0')
            for summary in data['body']['vat_summary']:
                calculated_total_from_vat += summary['taxable_amount'] + summary['vat_amount']
            
            calculated_total_from_vat = quantize(calculated_total_from_vat)
            original_total = data['body']['general_data']['total_amount']
            
            if original_total.is_zero() and calculated_total_from_vat > Decimal('0.0'):
                logger.warning(f"Totale documento originale 0.0 per '{general_data['doc_number']}'. "
                             f"Aggiornato con totale IVA: {calculated_total_from_vat:.2f}")
                data['body']['general_data']['total_amount'] = calculated_total_from_vat
            elif abs(original_total - calculated_total_from_vat) > Decimal('0.01'):
                logger.warning(f"Discrepanza Totale Doc ({original_total:.2f}) vs "
                             f"Riepilogo IVA ({calculated_total_from_vat:.2f}) per '{general_data['doc_number']}'.")
                
                # Se la discrepanza è significativa, usa il totale calcolato dall'IVA
                if abs(original_total - calculated_total_from_vat) > Decimal('1.0'):
                    logger.info(f"Discrepanza > 1€, uso totale calcolato da IVA: {calculated_total_from_vat:.2f}")
                    data['body']['general_data']['total_amount'] = calculated_total_from_vat

        # === ESTRAZIONE DATI PAGAMENTO ===
        payment_blocks_queries = [
            ".//*[local-name()='DatiPagamento']",
            "./*[local-name()='DatiPagamento']",
            ".//*[contains(local-name(), 'Pagamento')]"
        ]
        
        payment_blocks = []
        for query in payment_blocks_queries:
            payment_blocks = xpath_find_all(body_node, query)
            if payment_blocks:
                break
        
        logger.debug(f"Trovati {len(payment_blocks)} blocchi DatiPagamento.")
        
        payment_total_check = Decimal('0.0')
        last_due_date = None
        main_payment_method = None
        conditions = None
        
        if payment_blocks:
            # Condizioni pagamento dal primo blocco
            conditions_queries = [
                ".//*[local-name()='CondizioniPagamento']/text()",
                "./*[local-name()='CondizioniPagamento']/text()",
                ".//*[contains(local-name(), 'Condizioni')]/text()"
            ]
            conditions = xpath_get_text_robust(payment_blocks[0], conditions_queries)
            
            for pay_node in payment_blocks:
                block_conditions = xpath_get_text_robust(pay_node, conditions_queries) or conditions
                
                # Dettagli pagamento
                details_queries = [
                    ".//*[local-name()='DettaglioPagamento']",
                    "./*[local-name()='DettaglioPagamento']",
                    ".//*[contains(local-name(), 'Dettaglio')]"
                ]
                
                details_nodes = []
                for query in details_queries:
                    details_nodes = xpath_find_all(pay_node, query)
                    if details_nodes:
                        break
                
                for det_node in details_nodes:
                    # Modalità pagamento
                    payment_method_queries = [
                        ".//*[local-name()='ModalitaPagamento']/text()",
                        "./*[local-name()='ModalitaPagamento']/text()",
                        ".//*[contains(local-name(), 'Modalita')]/text()"
                    ]
                    payment_method = xpath_get_text_robust(det_node, payment_method_queries)
                    
                    # Data scadenza
                    due_date_queries = [
                        ".//*[local-name()='DataScadenzaPagamento']/text()",
                        "./*[local-name()='DataScadenzaPagamento']/text()",
                        ".//*[contains(local-name(), 'DataScadenza')]/text()",
                        ".//*[contains(local-name(), 'Scadenza')]/text()"
                    ]
                    due_date = xpath_get_text_robust(det_node, due_date_queries)
                    
                    # Importo pagamento
                    amount_queries = [
                        ".//*[local-name()='ImportoPagamento']/text()",
                        "./*[local-name()='ImportoPagamento']/text()",
                        ".//*[contains(local-name(), 'ImportoPag')]/text()"
                    ]
                    amount = xpath_get_decimal_robust(det_node, amount_queries, '0.0')
                    
                    pay_detail = {
                        'conditions': block_conditions,
                        'payment_method': payment_method,
                        'due_date': due_date,
                        'amount': amount
                    }
                    
                    data['body']['payment_data'].append(pay_detail)
                    payment_total_check += pay_detail['amount']
                    
                    # Prendi l'ultima data di scadenza valida trovata
                    if pay_detail.get('due_date'):
                        last_due_date = pay_detail['due_date']
                    
                    # Prendi il primo metodo di pagamento valido trovato
                    if not main_payment_method and pay_detail.get('payment_method'):
                        main_payment_method = pay_detail['payment_method']

            # Validazione totale pagamenti
            payment_total_check = quantize(payment_total_check)
            final_total_doc = data['body']['general_data']['total_amount']
            
            if payment_total_check > Decimal('0.0') and abs(final_total_doc - payment_total_check) > Decimal('0.01'):
                logger.warning(f"Discrepanza Totale Doc ({final_total_doc:.2f}) vs "
                             f"Somma Pagamenti ({payment_total_check:.2f}) per '{general_data['doc_number']}'.")

            # Imposta data scadenza a data doc se pagamento immediato e nessuna scadenza trovata
            if last_due_date is None and conditions in ['TP01', 'TP02']:  # TP01=Contanti, TP02=Completo
                last_due_date = general_data['doc_date']
                logger.info(f"Pagamento immediato ('{conditions}') per '{general_data['doc_number']}', "
                           f"scadenza impostata a data doc: {general_data['doc_date']}")

            data['body']['general_data']['due_date'] = last_due_date
            data['body']['general_data']['payment_method'] = main_payment_method

        logger.info(f"Parsing XML completato: {base_filename} (Tipo: {data['type']})")
        return data

    except etree.XMLSyntaxError as e:
        logger.error(f"Errore sintassi XML {base_filename}: {e}", exc_info=True)
        return {'error': f"Errore Sintassi XML: {e}", 'source_file': xml_filepath}
    except ValueError as ve:
        logger.error(f"Errore dati/struttura XML {base_filename}: {ve}", exc_info=True)
        return {'error': f"Errore Dati/Struttura XML: {ve}", 'source_file': xml_filepath}
    except TypeError as te:
        logger.error(f"Errore tipo dati (TypeError) durante parsing XML {base_filename}: {te}", exc_info=True)
        return {'error': f"Errore Tipo Dati: {te}", 'source_file': xml_filepath}
    except AttributeError as ae:
        logger.error(f"Errore attributo (AttributeError) durante parsing XML {base_filename}: {ae}", exc_info=True)
        return {'error': f"Errore Attributo (NoneType?): {ae}", 'source_file': xml_filepath}
    except Exception as e:
        logger.error(f"Errore generico parsing XML {base_filename}: {e}", exc_info=True)
        return {'error': f"Errore Generico Parsing: {e}", 'source_file': xml_filepath}

# === FUNZIONI DI UTILITÀ PER DEBUGGING ===
def debug_xml_structure(xml_filepath, max_depth=3):
    """
    Funzione di debug per analizzare la struttura di un XML problematico.
    Utile per capire come adattare i parser per fornitori specifici.
    """
    try:
        parser = etree.XMLParser(recover=True)
        tree = etree.parse(xml_filepath, parser)
        root = tree.getroot()
        
        def print_element(elem, depth=0, max_depth=max_depth):
            if depth > max_depth:
                return
            
            indent = "  " * depth
            tag_name = etree.QName(elem).localname if elem.tag else "Unknown"
            
            # Mostra attributi se presenti
            attrs = elem.attrib
            attr_str = ""
            if attrs:
                attr_str = " " + " ".join([f'{k}="{v}"' for k, v in attrs.items()])
            
            # Mostra testo se presente e non ha figli
            text_content = ""
            if elem.text and elem.text.strip() and len(list(elem)) == 0:
                text_content = f" = '{elem.text.strip()[:50]}...'" if len(elem.text.strip()) > 50 else f" = '{elem.text.strip()}'"
            
            print(f"{indent}<{tag_name}{attr_str}>{text_content}")
            
            # Stampa solo alcuni figli per evitare output troppo lungo
            children = list(elem)
            for i, child in enumerate(children[:10]):  # Limita a 10 figli per livello
                print_element(child, depth + 1, max_depth)
            
            if len(children) > 10:
                print(f"{indent}  ... e altri {len(children) - 10} elementi")
        
        print(f"\n=== STRUTTURA XML: {os.path.basename(xml_filepath)} ===")
        print_element(root)
        print("=" * 50)
        
    except Exception as e:
        logger.error(f"Errore analisi struttura XML {xml_filepath}: {e}")

def validate_xml_against_schema(xml_filepath, schema_path=None):
    """
    Valida un XML contro lo schema XSD delle fatture elettroniche italiane.
    Utile per verificare se il problema è nell'XML o nel parser.
    """
    try:
        # Se non è fornito uno schema, usa una validazione base
        if schema_path and os.path.exists(schema_path):
            with open(schema_path, 'r') as schema_file:
                schema_doc = etree.parse(schema_file)
                schema = etree.XMLSchema(schema_doc)
            
            xml_doc = etree.parse(xml_filepath)
            is_valid = schema.validate(xml_doc)
            
            if not is_valid:
                logger.error(f"XML non valido secondo schema: {xml_filepath}")
                for error in schema.error_log:
                    logger.error(f"Errore schema: {error}")
            else:
                logger.info(f"XML valido secondo schema: {xml_filepath}")
                
            return is_valid
        else:
            # Validazione base solo parsing
            parser = etree.XMLParser()
            etree.parse(xml_filepath, parser)
            logger.info(f"XML ben formato: {xml_filepath}")
            return True
            
    except etree.XMLSyntaxError as e:
        logger.error(f"XML malformato {xml_filepath}: {e}")
        return False
    except Exception as e:
        logger.error(f"Errore validazione XML {xml_filepath}: {e}")
        return False