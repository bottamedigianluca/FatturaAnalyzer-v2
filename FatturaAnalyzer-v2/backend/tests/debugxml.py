# debug_xml_parser.py - Tool per debuggare problemi di parsing XML

import os
import sys
import logging
from lxml import etree
import configparser
from pathlib import Path

# Aggiungi il path del progetto
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "app"))

from core.parser_xml import parse_fattura_xml, debug_xml_structure
from core.utils import _is_own_company

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_company_data():
    """Carica i dati azienda dal config"""
    my_company_data = {'piva': None, 'cf': None}
    try:
        config = configparser.ConfigParser()
        config_path = project_root / 'config.ini'
        
        if config_path.exists():
            config.read(config_path)
            my_company_data['piva'] = config.get('Azienda', 'PartitaIVA', fallback=None)
            my_company_data['cf'] = config.get('Azienda', 'CodiceFiscale', fallback=None)
            print(f"✅ Dati azienda caricati: PIVA={my_company_data['piva']}, CF={my_company_data['cf']}")
        else:
            print(f"❌ Config file non trovato: {config_path}")
            return None
    except Exception as e:
        print(f"❌ Errore lettura config: {e}")
        return None
    
    return my_company_data

def analyze_xml_basic_structure(xml_path):
    """Analizza la struttura base di un XML"""
    print(f"\n🔍 ANALISI STRUTTURA BASE: {os.path.basename(xml_path)}")
    print("=" * 60)
    
    try:
        parser = etree.XMLParser(recover=True)
        tree = etree.parse(xml_path, parser)
        root = tree.getroot()
        
        print(f"Root tag: {root.tag}")
        print(f"Root namespace: {root.nsmap}")
        print(f"Root attributes: {root.attrib}")
        
        # Trova i blocchi principali
        header = root.xpath("//*[local-name()='FatturaElettronicaHeader']")
        body = root.xpath("//*[local-name()='FatturaElettronicaBody']")
        
        print(f"Header trovati: {len(header)}")
        print(f"Body trovati: {len(body)}")
        
        if header:
            # Analizza header
            h = header[0]
            cedente = h.xpath(".//*[local-name()='CedentePrestatore']")
            cessionario = h.xpath(".//*[local-name()='CessionarioCommittente']")
            
            print(f"CedentePrestatore trovati: {len(cedente)}")
            print(f"CessionarioCommittente trovati: {len(cessionario)}")
            
            if cedente:
                c = cedente[0]
                piva_ced = c.xpath(".//*[local-name()='IdFiscaleIVA']/*[local-name()='IdCodice']/text()")
                cf_ced = c.xpath(".//*[local-name()='CodiceFiscale']/text()")
                denom_ced = c.xpath(".//*[local-name()='Denominazione']/text()")
                
                print(f"Cedente - PIVA: {piva_ced[0] if piva_ced else 'N/A'}")
                print(f"Cedente - CF: {cf_ced[0] if cf_ced else 'N/A'}")
                print(f"Cedente - Denominazione: {denom_ced[0] if denom_ced else 'N/A'}")
            
            if cessionario:
                c = cessionario[0]
                piva_ces = c.xpath(".//*[local-name()='IdFiscaleIVA']/*[local-name()='IdCodice']/text()")
                cf_ces = c.xpath(".//*[local-name()='CodiceFiscale']/text()")
                denom_ces = c.xpath(".//*[local-name()='Denominazione']/text()")
                
                print(f"Cessionario - PIVA: {piva_ces[0] if piva_ces else 'N/A'}")
                print(f"Cessionario - CF: {cf_ces[0] if cf_ces else 'N/A'}")
                print(f"Cessionario - Denominazione: {denom_ces[0] if denom_ces else 'N/A'}")
        
        if body:
            b = body[0]
            dati_gen = b.xpath(".//*[local-name()='DatiGeneraliDocumento']")
            if dati_gen:
                dg = dati_gen[0]
                doc_type = dg.xpath("./*[local-name()='TipoDocumento']/text()")
                doc_num = dg.xpath("./*[local-name()='Numero']/text()")
                doc_date = dg.xpath("./*[local-name()='Data']/text()")
                doc_total = dg.xpath("./*[local-name()='ImportoTotaleDocumento']/text()")
                
                print(f"Documento - Tipo: {doc_type[0] if doc_type else 'N/A'}")
                print(f"Documento - Numero: {doc_num[0] if doc_num else 'N/A'}")
                print(f"Documento - Data: {doc_date[0] if doc_date else 'N/A'}")
                print(f"Documento - Totale: {doc_total[0] if doc_total else 'N/A'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Errore analisi struttura: {e}")
        return False

def test_parsing_with_debug(xml_path, my_company_data):
    """Testa il parsing con debug dettagliato"""
    print(f"\n🧪 TEST PARSING: {os.path.basename(xml_path)}")
    print("=" * 60)
    
    # Abilita logging debug temporaneamente
    old_level = logging.getLogger('core.parser_xml').level
    logging.getLogger('core.parser_xml').setLevel(logging.DEBUG)
    
    try:
        result = parse_fattura_xml(xml_path, my_company_data)
        
        if result.get('error'):
            print(f"❌ ERRORE PARSING: {result['error']}")
            return False
        else:
            print(f"✅ PARSING RIUSCITO!")
            print(f"Tipo fattura: {result.get('type', 'Unknown')}")
            print(f"Hash: {result.get('unique_hash', 'N/A')}")
            
            general = result.get('body', {}).get('general_data', {})
            print(f"Numero: {general.get('doc_number', 'N/A')}")
            print(f"Data: {general.get('doc_date', 'N/A')}")
            print(f"Totale: {general.get('total_amount', 'N/A')}")
            
            lines = result.get('body', {}).get('lines', [])
            print(f"Righe estratte: {len(lines)}")
            
            vat_summary = result.get('body', {}).get('vat_summary', [])
            print(f"Riepiloghi IVA: {len(vat_summary)}")
            
            return True
            
    except Exception as e:
        print(f"❌ ERRORE CRITICO: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Ripristina livello logging
        logging.getLogger('core.parser_xml').setLevel(old_level)

def test_company_detection(xml_path, my_company_data):
    """Testa la rilevazione tipo azienda"""
    print(f"\n🏢 TEST RILEVAZIONE AZIENDA: {os.path.basename(xml_path)}")
    print("=" * 60)
    
    try:
        parser = etree.XMLParser(recover=True)
        tree = etree.parse(xml_path, parser)
        root = tree.getroot()
        
        # Estrai manualmente le anagrafiche per test
        header = root.xpath("//*[local-name()='FatturaElettronicaHeader']")[0]
        
        cedente = header.xpath(".//*[local-name()='CedentePrestatore']")[0]
        cessionario = header.xpath(".//*[local-name()='CessionarioCommittente']")[0]
        
        # Estrai dati cedente
        ced_piva = cedente.xpath(".//*[local-name()='IdFiscaleIVA']/*[local-name()='IdCodice']/text()")
        ced_cf = cedente.xpath(".//*[local-name()='CodiceFiscale']/text()")
        
        ced_anag = {
            'piva': ced_piva[0] if ced_piva else None,
            'cf': ced_cf[0] if ced_cf else None
        }
        
        # Estrai dati cessionario
        ces_piva = cessionario.xpath(".//*[local-name()='IdFiscaleIVA']/*[local-name()='IdCodice']/text()")
        ces_cf = cessionario.xpath(".//*[local-name()='CodiceFiscale']/text()")
        
        ces_anag = {
            'piva': ces_piva[0] if ces_piva else None,
            'cf': ces_cf[0] if ces_cf else None
        }
        
        print(f"My Company: PIVA={my_company_data.get('piva')}, CF={my_company_data.get('cf')}")
        print(f"Cedente: PIVA={ced_anag.get('piva')}, CF={ced_anag.get('cf')}")
        print(f"Cessionario: PIVA={ces_anag.get('piva')}, CF={ces_anag.get('cf')}")
        
        # Test rilevazione
        is_cedente_us = _is_own_company(ced_anag, my_company_data)
        is_cessionario_us = _is_own_company(ces_anag, my_company_data)
        
        print(f"Cedente è la nostra azienda: {is_cedente_us}")
        print(f"Cessionario è la nostra azienda: {is_cessionario_us}")
        
        if is_cedente_us and is_cessionario_us:
            tipo = 'Autofattura'
        elif is_cedente_us:
            tipo = 'Attiva'
        elif is_cessionario_us:
            tipo = 'Passiva'
        else:
            tipo = 'Unknown'
        
        print(f"Tipo fattura determinato: {tipo}")
        
        if tipo == 'Unknown':
            print("⚠️  PROBLEMA: Non riesco a determinare il tipo fattura!")
            print("   Verificare che P.IVA/CF in config.ini corrispondano a quelli nella fattura")
        
        return tipo != 'Unknown'
        
    except Exception as e:
        print(f"❌ Errore test rilevazione: {e}")
        return False

def compare_xml_structures(xml_paths):
    """Confronta le strutture di più XML per identificare differenze"""
    print(f"\n🔄 CONFRONTO STRUTTURE XML")
    print("=" * 60)
    
    structures = {}
    
    for xml_path in xml_paths:
        basename = os.path.basename(xml_path)
        print(f"\nAnalizzando: {basename}")
        
        try:
            parser = etree.XMLParser(recover=True)
            tree = etree.parse(xml_path, parser)
            root = tree.getroot()
            
            structure = {
                'root_tag': root.tag,
                'namespaces': list(root.nsmap.keys()) if root.nsmap else [],
                'has_header': len(root.xpath("//*[local-name()='FatturaElettronicaHeader']")) > 0,
                'has_body': len(root.xpath("//*[local-name()='FatturaElettronicaBody']")) > 0,
                'cedente_path': None,
                'cessionario_path': None,
                'sede_structure': None
            }
            
            # Analizza percorsi cedente
            header = root.xpath("//*[local-name()='FatturaElettronicaHeader']")
            if header:
                h = header[0]
                cedente_direct = h.xpath("./*[local-name()='CedentePrestatore']")
                cedente_anywhere = h.xpath(".//*[local-name()='CedentePrestatore']")
                
                if cedente_direct:
                    structure['cedente_path'] = 'direct_child'
                elif cedente_anywhere:
                    structure['cedente_path'] = 'anywhere_in_header'
                
                # Analizza struttura sede per cedente
                if cedente_anywhere:
                    sede = cedente_anywhere[0].xpath(".//*[local-name()='Sede']")
                    if sede:
                        s = sede[0]
                        has_indirizzo = len(s.xpath("./*[local-name()='Indirizzo']")) > 0
                        has_numero_civico = len(s.xpath("./*[local-name()='NumeroCivico']")) > 0
                        
                        structure['sede_structure'] = {
                            'has_indirizzo': has_indirizzo,
                            'has_numero_civico': has_numero_civico,
                            'separate_civic': has_numero_civico
                        }
                
                # Analizza cessionario
                ces_direct = h.xpath("./*[local-name()='CessionarioCommittente']")
                ces_anywhere = h.xpath(".//*[local-name()='CessionarioCommittente']")
                
                if ces_direct:
                    structure['cessionario_path'] = 'direct_child'
                elif ces_anywhere:
                    structure['cessionario_path'] = 'anywhere_in_header'
            
            structures[basename] = structure
            print(f"  ✅ Analisi completata")
            
        except Exception as e:
            print(f"  ❌ Errore: {e}")
            structures[basename] = {'error': str(e)}
    
    # Confronta strutture
    print(f"\n📊 RISULTATI CONFRONTO:")
    print("-" * 40)
    
    # Verifica consistenza
    first_structure = None
    consistent = True
    
    for filename, struct in structures.items():
        if 'error' in struct:
            print(f"{filename}: ERRORE - {struct['error']}")
            continue
            
        if first_structure is None:
            first_structure = struct
            print(f"{filename}: BASELINE")
        else:
            differences = []
            for key, value in struct.items():
                if key in first_structure and first_structure[key] != value:
                    differences.append(f"{key}: {first_structure[key]} -> {value}")
            
            if differences:
                consistent = False
                print(f"{filename}: DIFFERENZE - {', '.join(differences)}")
            else:
                print(f"{filename}: IDENTICA")
    
    print(f"\nStrutture consistenti: {'✅ SÌ' if consistent else '❌ NO'}")
    
    if not consistent:
        print("\n💡 RACCOMANDAZIONI:")
        print("- Le fatture hanno strutture XML diverse")
        print("- Il parser deve gestire entrambe le varianti")
        print("- Verificare i percorsi XPath nel parser")
    
    return structures

def main():
    """Funzione principale per test debug"""
    print("🔧 XML PARSER DEBUG TOOL")
    print("=" * 60)
    
    # Carica dati azienda
    my_company_data = load_company_data()
    if not my_company_data:
        print("❌ Impossibile caricare dati azienda. Uscita.")
        return
    
    # File di test (modifica questi percorsi)
    test_files = [
        # Aggiungi qui i percorsi dei tuoi file XML di test
        # Esempio:
        # "/path/to/facchini_working.xml",
        # "/path/to/polifunghi_not_working.xml",
    ]
    
    if not test_files:
        print("⚠️  Nessun file di test specificato.")
        print("   Modifica la lista 'test_files' nel codice con i percorsi dei tuoi XML.")
        return
    
    # Verifica file esistenti
    existing_files = [f for f in test_files if os.path.exists(f)]
    
    if not existing_files:
        print("❌ Nessun file di test trovato.")
        return
    
    print(f"📁 File da testare: {len(existing_files)}")
    for f in existing_files:
        print(f"  - {os.path.basename(f)}")
    
    # Test individuali
    results = {}
    
    for xml_file in existing_files:
        basename = os.path.basename(xml_file)
        print(f"\n" + "="*80)
        print(f"🔍 TESTING: {basename}")
        print(f"📁 Path: {xml_file}")
        
        # Test 1: Struttura base
        struct_ok = analyze_xml_basic_structure(xml_file)
        
        # Test 2: Rilevazione tipo azienda
        company_ok = test_company_detection(xml_file, my_company_data)
        
        # Test 3: Parsing completo
        parsing_ok = test_parsing_with_debug(xml_file, my_company_data)
        
        results[basename] = {
            'structure': struct_ok,
            'company_detection': company_ok,
            'parsing': parsing_ok,
            'overall': struct_ok and company_ok and parsing_ok
        }
        
        print(f"\n📋 RISULTATO {basename}:")
        print(f"  Struttura: {'✅' if struct_ok else '❌'}")
        print(f"  Rilevazione azienda: {'✅' if company_ok else '❌'}")
        print(f"  Parsing: {'✅' if parsing_ok else '❌'}")
        print(f"  OVERALL: {'✅ SUCCESSO' if results[basename]['overall'] else '❌ FALLIMENTO'}")
    
    # Confronto strutture se ci sono più file
    if len(existing_files) > 1:
        compare_xml_structures(existing_files)
    
    # Riassunto finale
    print(f"\n" + "="*80)
    print("📊 RIASSUNTO FINALE")
    print("="*80)
    
    success_count = sum(1 for r in results.values() if r['overall'])
    total_count = len(results)
    
    print(f"File testati: {total_count}")
    print(f"Successi: {success_count}")
    print(f"Fallimenti: {total_count - success_count}")
    print(f"Percentuale successo: {(success_count/total_count)*100:.1f}%")
    
    if success_count < total_count:
        print(f"\n💡 PROBLEMI IDENTIFICATI:")
        for filename, result in results.items():
            if not result['overall']:
                problems = []
                if not result['structure']:
                    problems.append("struttura XML")
                if not result['company_detection']:
                    problems.append("rilevazione azienda")
                if not result['parsing']:
                    problems.append("parsing completo")
                
                print(f"  - {filename}: {', '.join(problems)}")
        
        print(f"\n🔧 SOLUZIONI SUGGERITE:")
        print("1. Verificare che P.IVA/CF in config.ini siano corretti")
        print("2. Controllare i percorsi XPath nel parser per gestire varianti")
        print("3. Aggiungere logging debug per identificare punti di fallimento")
        print("4. Testare con XML semplificati per isolare problemi")

if __name__ == "__main__":
    main()
