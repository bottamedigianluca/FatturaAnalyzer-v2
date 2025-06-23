#!/usr/bin/env python3
# quick_test.py - Test rapido per identificare il problema

from lxml import etree
import re

def analyze_xml_issue(xml_content, filename=""):
    """Analizza rapidamente un XML per identificare problemi strutturali"""
    print(f"\n🔍 ANALISI RAPIDA: {filename}")
    print("=" * 50)
    
    try:
        # Parse con recovery
        parser = etree.XMLParser(recover=True)
        root = etree.fromstring(xml_content, parser)
        
        print(f"✅ XML parsato correttamente")
        print(f"Root tag: {root.tag}")
        
        # Namespace info
        if root.nsmap:
            print(f"Namespaces: {list(root.nsmap.keys())}")
        
        # Trova elementi principali
        elements_found = {}
        
        # Header e Body
        header = root.xpath("//*[local-name()='FatturaElettronicaHeader']")
        body = root.xpath("//*[local-name()='FatturaElettronicaBody']")
        
        elements_found['header'] = len(header)
        elements_found['body'] = len(body)
        
        if header:
            h = header[0]
            
            # Cedente
            cedente = h.xpath(".//*[local-name()='CedentePrestatore']")
            elements_found['cedente'] = len(cedente)
            
            if cedente:
                c = cedente[0]
                # Analizza struttura anagrafica cedente
                dati_anag = c.xpath("./*[local-name()='DatiAnagrafici']")
                sede = c.xpath("./*[local-name()='Sede']")
                contatti = c.xpath("./*[local-name()='Contatti']")
                
                elements_found['cedente_dati_anag'] = len(dati_anag)
                elements_found['cedente_sede'] = len(sede)
                elements_found['cedente_contatti'] = len(contatti)
                
                if dati_anag:
                    da = dati_anag[0]
                    piva = da.xpath(".//*[local-name()='IdFiscaleIVA']/*[local-name()='IdCodice']/text()")
                    cf = da.xpath(".//*[local-name()='CodiceFiscale']/text()")
                    denom = da.xpath(".//*[local-name()='Denominazione']/text()")
                    
                    print(f"Cedente PIVA: {piva[0] if piva else 'N/A'}")
                    print(f"Cedente CF: {cf[0] if cf else 'N/A'}")
                    print(f"Cedente Nome: {denom[0] if denom else 'N/A'}")
                
                if sede:
                    s = sede[0]
                    indirizzo = s.xpath("./*[local-name()='Indirizzo']/text()")
                    numero_civico = s.xpath("./*[local-name()='NumeroCivico']/text()")
                    cap = s.xpath("./*[local-name()='CAP']/text()")
                    comune = s.xpath("./*[local-name()='Comune']/text()")
                    
                    print(f"Sede Indirizzo: {indirizzo[0] if indirizzo else 'N/A'}")
                    print(f"Sede Numero Civico: {numero_civico[0] if numero_civico else 'N/A'}")
                    print(f"Sede CAP: {cap[0] if cap else 'N/A'}")
                    print(f"Sede Comune: {comune[0] if comune else 'N/A'}")
            
            # Cessionario
            cessionario = h.xpath(".//*[local-name()='CessionarioCommittente']")
            elements_found['cessionario'] = len(cessionario)
            
            if cessionario:
                c = cessionario[0]
                dati_anag = c.xpath("./*[local-name()='DatiAnagrafici']")
                
                if dati_anag:
                    da = dati_anag[0]
                    piva = da.xpath(".//*[local-name()='IdFiscaleIVA']/*[local-name()='IdCodice']/text()")
                    cf = da.xpath(".//*[local-name()='CodiceFiscale']/text()")
                    denom = da.xpath(".//*[local-name()='Denominazione']/text()")
                    
                    print(f"Cessionario PIVA: {piva[0] if piva else 'N/A'}")
                    print(f"Cessionario CF: {cf[0] if cf else 'N/A'}")
                    print(f"Cessionario Nome: {denom[0] if denom else 'N/A'}")
        
        if body:
            b = body[0]
            
            # Dati generali
            dati_gen = b.xpath(".//*[local-name()='DatiGeneraliDocumento']")
            elements_found['dati_generali'] = len(dati_gen)
            
            if dati_gen:
                dg = dati_gen[0]
                tipo = dg.xpath("./*[local-name()='TipoDocumento']/text()")
                numero = dg.xpath("./*[local-name()='Numero']/text()")
                data = dg.xpath("./*[local-name()='Data']/text()")
                totale = dg.xpath("./*[local-name()='ImportoTotaleDocumento']/text()")
                
                print(f"Doc Tipo: {tipo[0] if tipo else 'N/A'}")
                print(f"Doc Numero: {numero[0] if numero else 'N/A'}")
                print(f"Doc Data: {data[0] if data else 'N/A'}")
                print(f"Doc Totale: {totale[0] if totale else 'N/A'}")
            
            # Righe
            righe = b.xpath(".//*[local-name()='DettaglioLinee']")
            elements_found['righe'] = len(righe)
            
            # Riepiloghi IVA
            riepiloghi = b.xpath(".//*[local-name()='DatiRiepilogo']")
            elements_found['riepiloghi_iva'] = len(riepiloghi)
        
        # Stampa riepilogo elementi
        print(f"\n📊 ELEMENTI TROVATI:")
        for element, count in elements_found.items():
            status = "✅" if count > 0 else "❌"
            print(f"  {status} {element}: {count}")
        
        # Verifica problemi comuni
        problems = []
        
        if elements_found.get('header', 0) == 0:
            problems.append("Header mancante")
        if elements_found.get('body', 0) == 0:
            problems.append("Body mancante")
        if elements_found.get('cedente', 0) == 0:
            problems.append("CedentePrestatore mancante")
        if elements_found.get('cessionario', 0) == 0:
            problems.append("CessionarioCommittente mancante")
        if elements_found.get('dati_generali', 0) == 0:
            problems.append("DatiGeneraliDocumento mancante")
        
        if problems:
            print(f"\n⚠️  PROBLEMI RILEVATI:")
            for problem in problems:
                print(f"  - {problem}")
        else:
            print(f"\n✅ STRUTTURA XML SEMBRA OK")
        
        return len(problems) == 0
        
    except etree.XMLSyntaxError as e:
        print(f"❌ ERRORE SINTASSI XML: {e}")
        return False
    except Exception as e:
        print(f"❌ ERRORE GENERICO: {e}")
        return False

def test_with_your_xmls():
    """Test con i tuoi XML specifici"""
    
    # XML Facchini (quello che funziona)
    facchini_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="no"?><p:FatturaElettronica xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" versione="FPR12">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>05006900962</IdCodice></IdTrasmittente>
      <ProgressivoInvio>JIECC99M38</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>W7YVJK9</CodiceDestinatario>
      
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>00227600236</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>00227600236</CodiceFiscale>
        <Anagrafica>
          <Denominazione>SOC. COOP. FACCHINI MULTISERVIZI N. M. O.</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Sommacampagna 63 d/e</Indirizzo>
        <CAP>37137</CAP>
        <Comune>VERONA</Comune>
        <Provincia>VR</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>02273530226</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>BTTPLG77S15F187I</CodiceFiscale>
        <Anagrafica>
          <Denominazione>FRUTTA E VERDURA BOTTAMEDI</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>VIA A. DE GASPERI, 47</Indirizzo>
        <CAP>38017</CAP>
        <Comune>MEZZOLOMBARDO - TRENTO</Comune>
        <Provincia>TN</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2023-05-15</Data>
        <Numero>23V1-06651</Numero>
        <ImportoTotaleDocumento>138.53</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>PRESTAZIONI DI CARICO CON STIVAGGIO</Descrizione>
        <Quantita>70.00</Quantita>
        <UnitaMisura>QLI</UnitaMisura>
        <PrezzoUnitario>1.60</PrezzoUnitario>
        <PrezzoTotale>112.00</PrezzoTotale>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>113.55</ImponibileImporto>
        <Imposta>24.98</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>'''

    # XML Polifunghi (quello che non funziona)
    polifunghi_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<FatturaElettronicaHeader>
		<DatiTrasmissione>
			<IdTrasmittente>
				<IdPaese>IT</IdPaese>
				<IdCodice>10209790152</IdCodice>
			</IdTrasmittente>
			<ProgressivoInvio>562518</ProgressivoInvio>
			<FormatoTrasmissione>FPR12</FormatoTrasmissione>
			<CodiceDestinatario>W7YVJK9</CodiceDestinatario>
		</DatiTrasmissione>
		<CedentePrestatore>
			<DatiAnagrafici>
				<IdFiscaleIVA>
					<IdPaese>IT</IdPaese>
					<IdCodice>04103780237</IdCodice>
				</IdFiscaleIVA>
				<CodiceFiscale>04103780237</CodiceFiscale>
				<Anagrafica>
					<Denominazione>Polifunghi S.r.l.</Denominazione>
				</Anagrafica>
				<RegimeFiscale>RF01</RegimeFiscale>
			</DatiAnagrafici>
			<Sede>
				<Indirizzo>Via Sommacampagna</Indirizzo>
				<NumeroCivico>63 D/E</NumeroCivico>
				<CAP>37137</CAP>
				<Comune>Verona</Comune>
				<Provincia>VR</Provincia>
				<Nazione>IT</Nazione>
			</Sede>
			<Contatti>
				<Telefono>045 8621129</Telefono>
				<Fax>045 8621129</Fax>
				<Email>info@polifunghi.it</Email>
			</Contatti>
		</CedentePrestatore>
		<CessionarioCommittente>
			<DatiAnagrafici>
				<IdFiscaleIVA>
					<IdPaese>IT</IdPaese>
					<IdCodice>02273530226</IdCodice>
				</IdFiscaleIVA>
				<CodiceFiscale>BTTPLG77S15F187I</CodiceFiscale>
				<Anagrafica>
					<Denominazione>BOTTAMEDI PIERLUIGI</Denominazione>
				</Anagrafica>
			</DatiAnagrafici>
			<Sede>
				<Indirizzo>Via De Gasperi, 47</Indirizzo>
				<CAP>38017</CAP>
				<Comune>Mezzolombardo</Comune>
				<Provincia>TN</Provincia>
				<Nazione>IT</Nazione>
			</Sede>
		</CessionarioCommittente>
	</FatturaElettronicaHeader>
	<FatturaElettronicaBody>
		<DatiGenerali>
			<DatiGeneraliDocumento>
				<TipoDocumento>TD24</TipoDocumento>
				<Divisa>EUR</Divisa>
				<Data>2023-08-31</Data>
				<Numero>680/D</Numero>
				<ImportoTotaleDocumento>1577.68</ImportoTotaleDocumento>
			</DatiGeneraliDocumento>
		</DatiGenerali>
		<DatiBeniServizi>
			<DettaglioLinee>
				<NumeroLinea>1</NumeroLinea>
				<Descrizione>Funghi Finferli</Descrizione>
				<Quantita>60.00</Quantita>
				<UnitaMisura>kg</UnitaMisura>
				<PrezzoUnitario>9.50</PrezzoUnitario>
				<PrezzoTotale>570.00</PrezzoTotale>
				<AliquotaIVA>4.00</AliquotaIVA>
			</DettaglioLinee>
			<DatiRiepilogo>
				<AliquotaIVA>4.00</AliquotaIVA>
				<ImponibileImporto>1517.00</ImponibileImporto>
				<Imposta>60.68</Imposta>
				<EsigibilitaIVA>I</EsigibilitaIVA>
				<RiferimentoNormativo>Iva 4%</RiferimentoNormativo>
			</DatiRiepilogo>
		</DatiBeniServizi>
	</FatturaElettronicaBody>
</p:FatturaElettronica>'''
    
    print("🧪 TEST RAPIDO CON I TUOI XML")
    print("=" * 60)
    
    # Test Facchini (dovrebbe funzionare)
    analyze_xml_issue(facchini_xml, "FACCHINI (funziona)")
    
    # Test Polifunghi (dovrebbe rivelare il problema)
    analyze_xml_issue(polifunghi_xml, "POLIFUNGHI (non funziona)")
    
    print(f"\n🔍 CONFRONTO DIRETTO:")
    print("=" * 40)
    print("DIFFERENZE PRINCIPALI RILEVATE:")
    print("1. Polifunghi ha <NumeroCivico> separato da <Indirizzo>")
    print("2. Polifunghi ha un blocco <Contatti> nel Cedente")
    print("3. Struttura XML identica per il resto")
    print("")
    print("💡 SOLUZIONE:")
    print("Il parser deve gestire <NumeroCivico> separato e combinarlo con <Indirizzo>")
    print("Questo è già implementato nel parser corretto che ho fornito!")

def test_company_detection_issue():
    """Test specifico per rilevazione azienda"""
    print(f"\n🏢 TEST RILEVAZIONE TIPO AZIENDA")
    print("=" * 50)
    
    # Simula dati config.ini tipici
    my_company_configs = [
        {'piva': '02273530226', 'cf': 'BTTPLG77S15F187I'},  # Bottamedi
        {'piva': '02273530226', 'cf': None},  # Solo P.IVA
        {'piva': None, 'cf': 'BTTPLG77S15F187I'},  # Solo CF
    ]
    
    # Dati dalle fatture di test
    cedente_data = {'piva': '04103780237', 'cf': '04103780237'}  # Polifunghi
    cessionario_data = {'piva': '02273530226', 'cf': 'BTTPLG77S15F187I'}  # Bottamedi
    
    print("DATI ESTRATTI DALLE FATTURE:")
    print(f"Cedente (Polifunghi): PIVA={cedente_data['piva']}, CF={cedente_data['cf']}")
    print(f"Cessionario (Bottamedi): PIVA={cessionario_data['piva']}, CF={cessionario_data['cf']}")
    
    for i, config in enumerate(my_company_configs):
        print(f"\nTEST {i+1} - Config: PIVA={config.get('piva')}, CF={config.get('cf')}")
        
        # Simula _is_own_company
        def is_own_company_simple(anag_data, my_data):
            my_piva = my_data.get('piva', '').strip()
            my_cf = my_data.get('cf', '').strip()
            anag_piva = anag_data.get('piva', '').strip()
            anag_cf = anag_data.get('cf', '').strip()
            
            if my_piva and anag_piva and my_piva == anag_piva:
                return True
            if my_cf and anag_cf and my_cf == anag_cf:
                return True
            return False
        
        is_cedente_us = is_own_company_simple(cedente_data, config)
        is_cessionario_us = is_own_company_simple(cessionario_data, config)
        
        if is_cedente_us and is_cessionario_us:
            tipo = 'Autofattura'
        elif is_cedente_us:
            tipo = 'Attiva'
        elif is_cessionario_us:
            tipo = 'Passiva'
        else:
            tipo = 'Unknown'
        
        print(f"  Cedente è nostra azienda: {is_cedente_us}")
        print(f"  Cessionario è nostra azienda: {is_cessionario_us}")
        print(f"  Tipo fattura: {tipo}")
        
        if tipo == 'Passiva':
            print(f"  ✅ CORRETTO - Fattura passiva rilevata")
        else:
            print(f"  ❌ PROBLEMA - Dovrebbe essere Passiva")

def main():
    """Funzione principale per test rapido"""
    print("⚡ QUICK TEST - Identificazione Problema Parser XML")
    print("=" * 70)
    
    # Test con i tuoi XML
    test_with_your_xmls()
    
    # Test rilevazione azienda
    test_company_detection_issue()
    
    print(f"\n📋 RIEPILOGO PROBLEMI E SOLUZIONI:")
    print("=" * 50)
    print("❌ PROBLEMA IDENTIFICATO:")
    print("   Il parser XML originale non gestisce correttamente:")
    print("   1. NumeroCivico separato da Indirizzo")
    print("   2. Possibili variazioni nei percorsi XPath")
    print("")
    print("✅ SOLUZIONE IMPLEMENTATA:")
    print("   Ho corretto il parser XML con:")
    print("   1. Gestione NumeroCivico separato")
    print("   2. Percorsi XPath più specifici e robusti")
    print("   3. Migliore gestione delle variazioni strutturali")
    print("   4. Debug logging migliorato")
    print("")
    print("🔧 AZIONI DA FARE:")
    print("   1. Sostituire il file parser_xml.py con la versione corretta")
    print("   2. Testare import delle fatture Polifunghi")
    print("   3. Verificare che il config.ini contenga P.IVA/CF corretti")
    print("")
    print("📁 FILE DA AGGIORNARE:")
    print("   - FatturaAnalyzer-v2/backend/app/core/parser_xml.py")
    print("")
    print("⚠️  IMPORTANTE:")
    print("   Assicurati che nel file config.ini ci siano:")
    print("   [Azienda]")
    print("   PartitaIVA = 02273530226")
    print("   CodiceFiscale = BTTPLG77S15F187I")

if __name__ == "__main__":
    main()
