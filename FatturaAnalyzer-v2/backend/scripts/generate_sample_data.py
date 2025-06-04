#!/usr/bin/env python3
"""
Script per generare dati di esempio per sviluppo
"""

import asyncio
import sys
import random
from datetime import date, timedelta
from pathlib import Path

# Add path per importare moduli da 'app'
# Lo script è in backend/scripts/, quindi dobbiamo aggiungere backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.adapters.database_adapter import db_adapter
from app.core.utils import calculate_invoice_hash # Per generare hash univoci

SAMPLE_COMPANIES = [
    {"denomination": "Acme Corporation SRL", "piva": "12345678901", "city": "Milano", "province": "MI"},
    {"denomination": "Beta Solutions SpA", "piva": "23456789012", "city": "Roma", "province": "RM"},
    {"denomination": "Gamma Services SRL", "piva": "34567890123", "city": "Torino", "province": "TO"},
    {"denomination": "Delta Tech SRL", "piva": "45678901234", "city": "Napoli", "province": "NA"},
    {"denomination": "Epsilon Consulting SRL", "piva": "56789012345", "city": "Firenze", "province": "FI"},
]

SAMPLE_SUPPLIERS = [
    {"denomination": "Fornitore Energia SpA", "piva": "67890123456", "city": "Bologna", "province": "BO"},
    {"denomination": "Telecom Provider SRL", "piva": "78901234567", "city": "Genova", "province": "GE"},
    {"denomination": "Office Supplies SRL", "piva": "89012345678", "city": "Palermo", "province": "PA"},
]

async def generate_anagraphics():
    """Genera anagrafiche di esempio"""
    print("👥 Generating sample anagraphics...")
    created_anag_ids = []

    # Clienti
    for i, company in enumerate(SAMPLE_COMPANIES, 1):
        anag_data = {
            **company,
            "type": "Cliente",
            "cf": company["piva"], # Per semplicità, usa piva come cf
            "address": f"Via Roma {i * 10}",
            "cap": f"001{i:02d}",
            "country": "IT",
            "email": f"info@{company['denomination'].lower().replace(' ', '').replace('srl', '').replace('spa', '')}.it",
            "phone": f"+39 0{i} 123456{i}"
        }
        
        anag_id = await db_adapter.add_anagraphics_async(anag_data, "Cliente")
        if anag_id:
            print(f"  ✅ Created client: {company['denomination']} (ID: {anag_id})")
            created_anag_ids.append(anag_id)
        else:
            print(f"  ⚠️ Failed to create client: {company['denomination']}")
    
    # Fornitori
    for i, supplier in enumerate(SAMPLE_SUPPLIERS, 1):
        anag_data = {
            **supplier,
            "type": "Fornitore", 
            "cf": supplier["piva"], # Per semplicità
            "address": f"Via Milano {i * 5}",
            "cap": f"002{i:02d}",
            "country": "IT",
            "email": f"fatture@{supplier['denomination'].lower().replace(' ', '').replace('srl', '').replace('spa', '')}.it",
            "phone": f"+39 0{i+5} 987654{i}"
        }
        
        anag_id = await db_adapter.add_anagraphics_async(anag_data, "Fornitore")
        if anag_id:
            print(f"  ✅ Created supplier: {supplier['denomination']} (ID: {anag_id})")
            created_anag_ids.append(anag_id)
        else:
            print(f"  ⚠️ Failed to create supplier: {supplier['denomination']}")
    return created_anag_ids

async def generate_invoices(anagraphics_map):
    """Genera fatture di esempio"""
    print("🧾 Generating sample invoices...")
    
    if not anagraphics_map:
        print("❌ No anagraphics found. Generate anagraphics first.")
        return
    
    # Genera fatture degli ultimi 6 mesi
    base_date = date.today() - timedelta(days=180)
    
    for i in range(50):  # 50 fatture di esempio
        # Scegli anagrafica casuale
        anag_id = random.choice(list(anagraphics_map.keys()))
        anag_details = anagraphics_map[anag_id]
        
        # Data casuale negli ultimi 6 mesi
        random_days = random.randint(0, 180)
        doc_date = base_date + timedelta(days=random_days)
        due_date = doc_date + timedelta(days=random.choice([15, 30, 60, 90]))
        
        # Tipo fattura basato su tipo anagrafica
        invoice_type = "Attiva" if anag_details["type"] == "Cliente" else "Passiva"
        
        # Importo casuale
        amount = round(random.uniform(50, 2500), 2)
        doc_number = f"SAMPLE{doc_date.year}{i+1:04d}"
        doc_type = "TD01" # Fattura standard
        
        # Status casuale
        statuses = ["Aperta", "Pagata Tot.", "Pagata Parz.", "Scaduta"]
        weights = [0.3, 0.5, 0.1, 0.1] if invoice_type == "Attiva" else [0.2, 0.6, 0.1, 0.1]
        status = random.choices(statuses, weights=weights)[0]
        
        # Importo pagato
        if status == "Pagata Tot.":
            paid_amount = amount
        elif status == "Pagata Parz.":
            paid_amount = round(amount * random.uniform(0.2, 0.8), 2)
        else:
            paid_amount = 0.0
        
        # Genera hash univoco
        unique_hash = calculate_invoice_hash(
            cedente_id=anag_details["piva"] if invoice_type == "Passiva" else "MYCOMPANYPIVA", # Sostituisci con tua PIVA
            cessionario_id=anag_details["piva"] if invoice_type == "Attiva" else "MYCOMPANYPIVA",
            doc_type=doc_type,
            doc_number=doc_number,
            doc_date=doc_date
        )
        
        # Inserisci fattura
        invoice_query = """
            INSERT INTO Invoices 
            (anagraphics_id, type, doc_type, doc_number, doc_date, total_amount, 
             due_date, payment_status, paid_amount, payment_method, unique_hash, 
             created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """
        
        try:
            invoice_id = await db_adapter.execute_write_async(invoice_query, (
                anag_id,
                invoice_type,
                doc_type,
                doc_number,
                doc_date.isoformat(),
                amount,
                due_date.isoformat(),
                status,
                paid_amount,
                random.choice(["Bonifico", "Carta", "Contanti", "RID"]),
                unique_hash
            ))
            if invoice_id:
                 print(f"  ✅ Created invoice: {doc_number} - {anag_details['denomination']} - €{amount:.2f} - Status: {status}")
            else:
                 print(f"  ⚠️ Failed to create invoice {doc_number} (no ID returned)")
        except Exception as e:
            print(f"  ❌ Error creating invoice {doc_number}: {e}")


async def generate_transactions():
    """Genera transazioni bancarie di esempio"""
    print("💳 Generating sample bank transactions...")
    
    # Genera transazioni degli ultimi 3 mesi
    base_date = date.today() - timedelta(days=90)
    
    transaction_types = [
        ("VERSAMENTO CLIENTE", lambda: random.uniform(100, 3000), True),
        ("BONIFICO FORNITORE", lambda: -random.uniform(50, 2000), False),
        ("COMMISSIONI BANCA", lambda: -random.uniform(2, 50), False),
        ("PAGAMENTO POS", lambda: random.uniform(10, 300), True), # Entrata per il negozio
        ("PRELIEVO ATM", lambda: -random.uniform(20, 300), False),
        ("ACCREDITO STIPENDI", lambda: -random.uniform(1000, 3000), False), # Uscita per l'azienda
        ("F24", lambda: -random.uniform(100, 1000), False),
        ("INTERESSI ATTIVI", lambda: random.uniform(1, 50), True)
    ]
    
    anagraphics_map = {
        anag["id"]: anag 
        for anag in await db_adapter.execute_query_async("SELECT id, denomination FROM Anagraphics")
    }

    for i in range(100):  # 100 transazioni di esempio
        # Data casuale negli ultimi 3 mesi
        random_days = random.randint(0, 90)
        trans_date = base_date + timedelta(days=random_days)
        value_date = trans_date + timedelta(days=random.randint(0,2))
        
        # Tipo transazione casuale
        desc_template, amount_func, is_income_for_bank = random.choice(transaction_types)
        amount = round(amount_func(), 2)
        
        # Descrizione con variazioni
        description_parts = [desc_template]
        if "CLIENTE" in desc_template and anagraphics_map:
            client = random.choice([anag for anag_id, anag in anagraphics_map.items() if anag_id % 3 == 0]) # Seleziona un cliente casuale
            description_parts.append(client['denomination'][:15])
        elif "FORNITORE" in desc_template and anagraphics_map:
            supplier = random.choice([anag for anag_id, anag in anagraphics_map.items() if anag_id % 3 == 1]) # Seleziona un fornitore
            description_parts.append(supplier['denomination'][:15])
        
        description_parts.append(f"RIF{random.randint(1000,9999)}")
        description = " ".join(description_parts)
        
        # Status riconciliazione
        recon_status = random.choices(
            ["Da Riconciliare", "Riconciliato Tot.", "Riconciliato Parz.", "Ignorato"],
            weights=[0.5, 0.3, 0.1, 0.1]
        )[0]
        
        reconciled_amount = 0.0
        if recon_status == "Riconciliato Tot.":
            reconciled_amount = abs(amount)
        elif recon_status == "Riconciliato Parz.":
            reconciled_amount = round(abs(amount) * random.uniform(0.2, 0.8), 2)
        
        # Hash univoco
        from app.core.utils import calculate_transaction_hash # Import locale per evitare dipendenze globali
        unique_hash = calculate_transaction_hash(trans_date, amount, description)

        # Inserisci transazione
        trans_query = """
            INSERT INTO BankTransactions 
            (transaction_date, value_date, amount, description, unique_hash, 
             reconciled_amount, reconciliation_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """
        try:
            trans_id = await db_adapter.execute_write_async(trans_query, (
                trans_date.isoformat(),
                value_date.isoformat(),
                amount,
                description,
                unique_hash,
                reconciled_amount,
                recon_status
            ))
            if trans_id:
                 print(f"  ✅ Created transaction: {trans_date.strftime('%d/%m/%y')} - {description[:30]}... - €{amount:.2f} - {recon_status}")
            else:
                 print(f"  ⚠️ Failed to create transaction for {description[:30]}")
        except Exception as e:
            print(f"  ❌ Error creating transaction for {description[:30]}: {e} (Hash: {unique_hash})")


async def main_async():
    """Setup e generazione dati"""
    if not await setup_database(): # Assicurati che le tabelle esistano
        return

    print("--- STARTING SAMPLE DATA GENERATION ---")
    created_anag_ids = await generate_anagraphics()
    
    if created_anag_ids:
        # Prepara una mappa id -> dettagli per generate_invoices
        anagraphics_details = await db_adapter.execute_query_async(
            f"SELECT id, denomination, type, piva FROM Anagraphics WHERE id IN ({','.join('?'*len(created_anag_ids))})",
            tuple(created_anag_ids)
        )
        anagraphics_map = {row['id']: dict(row) for row in anagraphics_details}
        await generate_invoices(anagraphics_map)
    else:
        print("Skipping invoice generation as no anagraphics were created/found.")
        
    await generate_transactions()
    print("--- SAMPLE DATA GENERATION COMPLETED ---")

if __name__ == "__main__":
    # Prima esegui setup_db per essere sicuro che le tabelle esistano
    try:
        if not asyncio.run(setup_database()):
            print("DB setup failed, aborting sample data generation.")
            sys.exit(1)
        asyncio.run(main_async())
    except Exception as e:
        print(f"❌ Critical error during sample data generation: {e}")
        sys.exit(1)
