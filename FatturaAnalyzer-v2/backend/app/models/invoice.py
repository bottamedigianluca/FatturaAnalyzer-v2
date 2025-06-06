# app/models/invoice.py
"""
Modelli Pydantic specifici per le fatture
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, validator
from app.models import BaseConfig, InvoiceType, PaymentStatus


class DocumentType(str, Enum):
    """Tipo documento fattura elettronica"""
    TD01 = "TD01"  # Fattura
    TD02 = "TD02"  # Acconto/anticipo su fattura
    TD03 = "TD03"  # Acconto/anticipo su parcella
    TD04 = "TD04"  # Nota di credito
    TD05 = "TD05"  # Nota di debito
    TD06 = "TD06"  # Parcella
    TD16 = "TD16"  # Integrazione fattura reverse charge interno
    TD17 = "TD17"  # Integrazione/autofattura per acquisto servizi dall'estero
    TD18 = "TD18"  # Integrazione per acquisto di beni intracomunitari
    TD19 = "TD19"  # Integrazione/autofattura per acquisto di beni ex art.17 c.2 DPR 633/72
    TD20 = "TD20"  # Autofattura per regolarizzazione e integrazione delle fatture
    TD21 = "TD21"  # Autofattura per splafonamento
    TD22 = "TD22"  # Estrazione beni da deposito IVA
    TD23 = "TD23"  # Estrazione beni da deposito IVA con versamento dell'IVA
    TD24 = "TD24"  # Fattura differita di cui all'art.21, comma 4, lett. a)
    TD25 = "TD25"  # Fattura differita di cui all'art.21, comma 4, lett. b)
    TD26 = "TD26"  # Cessione di beni ammortizzabili e per passaggi interni
    TD27 = "TD27"  # Fattura per autoconsumo o per cessioni gratuite senza rivalsa


class PaymentMethod(str, Enum):
    """Metodi di pagamento"""
    MP01 = "MP01"  # Contanti
    MP02 = "MP02"  # Assegno
    MP03 = "MP03"  # Assegno circolare
    MP04 = "MP04"  # Contanti presso Tesoreria
    MP05 = "MP05"  # Bonifico
    MP06 = "MP06"  # Vaglia cambiario
    MP07 = "MP07"  # Bollettino bancario
    MP08 = "MP08"  # Carta di pagamento
    MP09 = "MP09"  # RID
    MP10 = "MP10"  # RID utenze
    MP11 = "MP11"  # RID veloce
    MP12 = "MP12"  # RIBA
    MP13 = "MP13"  # MAV
    MP14 = "MP14"  # Quietanza erario
    MP15 = "MP15"  # Giroconto su conti di contabilità speciale
    MP16 = "MP16"  # Domiciliazione bancaria
    MP17 = "MP17"  # Domiciliazione postale
    MP18 = "MP18"  # Bollettino di c/c postale
    MP19 = "MP19"  # SEPA Direct Debit
    MP20 = "MP20"  # SEPA Direct Debit CORE
    MP21 = "MP21"  # SEPA Direct Debit B2B
    MP22 = "MP22"  # Trattenuta su somme già riscosse


class VATRegime(str, Enum):
    """Regime fiscale IVA"""
    RF01 = "RF01"  # Ordinario
    RF02 = "RF02"  # Contribuenti minimi
    RF04 = "RF04"  # Agricoltura e attività connesse e pesca
    RF05 = "RF05"  # Vendita sali e tabacchi
    RF06 = "RF06"  # Commercio fiammiferi
    RF07 = "RF07"  # Editoria
    RF08 = "RF08"  # Gestione servizi telefonia pubblica
    RF09 = "RF09"  # Rivendita documenti di trasporto pubblico e di sosta
    RF10 = "RF10"  # Intrattenimenti, giochi e altre attività
    RF11 = "RF11"  # Agenzie viaggi e turismo
    RF12 = "RF12"  # Agriturismo
    RF13 = "RF13"  # Vendite a domicilio
    RF14 = "RF14"  # Rivendita beni usati, oggetti d'arte, d'antiquariato
    RF15 = "RF15"  # Agenzie asta pubblica
    RF16 = "RF16"  # IVA per cassa P.A.
    RF17 = "RF17"  # IVA per cassa soggetti privati
    RF19 = "RF19"  # Regime forfettario
    RF18 = "RF18"  # Altro


class InvoiceLineExtended(BaseModel, BaseConfig):
    """Riga fattura estesa con campi aggiuntivi"""
    id: Optional[int] = None
    invoice_id: Optional[int] = None
    line_number: int = Field(..., ge=1, description="Numero progressivo riga")
    
    # Dati prodotto/servizio
    item_code: Optional[str] = Field(None, max_length=50, description="Codice articolo")
    item_type: Optional[str] = Field(None, max_length=50, description="Tipo articolo")
    description: str = Field(..., min_length=1, max_length=1000, description="Descrizione")
    
    # Quantità e misure
    quantity: float = Field(default=1.0, gt=0, description="Quantità")
    unit_measure: Optional[str] = Field(None, max_length=20, description="Unità di misura")
    unit_price: float = Field(..., ge=0, description="Prezzo unitario")
    
    # Prezzi e sconti
    list_price: Optional[float] = Field(None, ge=0, description="Prezzo di listino")
    discount_percent: Optional[float] = Field(None, ge=0, le=100, description="Sconto percentuale")
    discount_amount: Optional[float] = Field(None, ge=0, description="Sconto fisso")
    total_price: float = Field(..., ge=0, description="Totale riga")
    
    # IVA e tasse
    vat_rate: float = Field(..., ge=0, le=100, description="Aliquota IVA")
    vat_nature: Optional[str] = Field(None, max_length=4, description="Natura IVA (es. N1, N2)")
    vat_amount: Optional[float] = Field(None, ge=0, description="Importo IVA")
    
    # Ritenute e contributi
    withholding_tax_rate: Optional[float] = Field(None, ge=0, le=100, description="Aliquota ritenuta")
    withholding_tax_amount: Optional[float] = Field(None, ge=0, description="Importo ritenuta")
    social_security_rate: Optional[float] = Field(None, ge=0, le=100, description="Aliquota contributi")
    social_security_amount: Optional[float] = Field(None, ge=0, description="Importo contributi")
    
    # Metadati
    notes: Optional[str] = Field(None, max_length=500, description="Note riga")
    
    @validator('total_price', pre=True, always=True)
    def calculate_total_price(cls, v, values):
        if v is None and 'quantity' in values and 'unit_price' in values:
            quantity = values['quantity']
            unit_price = values['unit_price']
            discount_percent = values.get('discount_percent', 0) or 0
            discount_amount = values.get('discount_amount', 0) or 0
            
            subtotal = quantity * unit_price
            if discount_percent > 0:
                subtotal = subtotal * (1 - discount_percent / 100)
            if discount_amount > 0:
                subtotal = subtotal - discount_amount
            
            return round(max(0, subtotal), 2)
        return v


class InvoiceVATSummaryExtended(BaseModel, BaseConfig):
    """Riassunto IVA esteso"""
    id: Optional[int] = None
    invoice_id: Optional[int] = None
    vat_rate: float = Field(..., ge=0, le=100, description="Aliquota IVA")
    vat_nature: Optional[str] = Field(None, max_length=4, description="Natura IVA")
    taxable_amount: float = Field(..., ge=0, description="Imponibile")
    vat_amount: float = Field(..., ge=0, description="Imposta")
    withholding_tax_amount: Optional[float] = Field(None, ge=0, description="Ritenuta")
    social_security_amount: Optional[float] = Field(None, ge=0, description="Contributi")
    
    # Campi aggiuntivi per fatture estere
    vat_exemption_reference: Optional[str] = Field(None, max_length=200, description="Riferimento esenzione")
    
    @validator('vat_amount', pre=True, always=True)
    def calculate_vat_amount(cls, v, values):
        if v is None and 'taxable_amount' in values and 'vat_rate' in values:
            return round(values['taxable_amount'] * values['vat_rate'] / 100, 2)
        return v


class InvoiceAttachment(BaseModel, BaseConfig):
    """Allegato fattura"""
    id: Optional[int] = None
    invoice_id: int
    filename: str = Field(..., min_length=1, max_length=200)
    file_path: str = Field(..., min_length=1, max_length=500)
    file_size: int = Field(..., gt=0, description="Dimensione file in bytes")
    content_type: str = Field(..., max_length=100, description="MIME type")
    attachment_type: str = Field(default="Document", max_length=50, description="Tipo allegato")
    description: Optional[str] = Field(None, max_length=500)
    uploaded_at: datetime = Field(default_factory=datetime.now)


class InvoicePayment(BaseModel, BaseConfig):
    """Pagamento fattura"""
    id: Optional[int] = None
    invoice_id: int
    payment_date: date
    amount: float = Field(..., gt=0, description="Importo pagamento")
    payment_method: Optional[PaymentMethod] = None
    payment_reference: Optional[str] = Field(None, max_length=100, description="Riferimento pagamento")
    transaction_id: Optional[int] = Field(None, description="ID transazione bancaria collegata")
    notes: Optional[str] = Field(None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.now)


class InvoiceExtended(BaseModel, BaseConfig):
    """Fattura estesa con tutti i campi e relazioni"""
    id: Optional[int] = None
    
    # Dati base
    anagraphics_id: int = Field(..., gt=0, description="ID anagrafica")
    type: InvoiceType = Field(..., description="Tipo fattura")
    doc_type: DocumentType = Field(default=DocumentType.TD01, description="Tipo documento")
    doc_number: str = Field(..., min_length=1, max_length=50, description="Numero documento")
    doc_date: date = Field(..., description="Data documento")
    
    # Importi
    subtotal_amount: Optional[float] = Field(None, ge=0, description="Subtotale")
    discount_amount: Optional[float] = Field(None, ge=0, description="Sconto totale")
    taxable_amount: Optional[float] = Field(None, ge=0, description="Imponibile totale")
    vat_amount: Optional[float] = Field(None, ge=0, description="IVA totale")
    withholding_tax_amount: Optional[float] = Field(None, ge=0, description="Ritenuta totale")
    social_security_amount: Optional[float] = Field(None, ge=0, description="Contributi totali")
    stamp_duty_amount: Optional[float] = Field(None, ge=0, description="Bollo")
    total_amount: float = Field(..., ge=0, description="Totale fattura")
    
    # Pagamento
    payment_status: PaymentStatus = Field(default=PaymentStatus.APERTA, description="Stato pagamento")
    paid_amount: float = Field(default=0.0, ge=0, description="Importo pagato")
    due_date: Optional[date] = Field(None, description="Data scadenza")
    payment_method: Optional[PaymentMethod] = None
    payment_terms: Optional[str] = Field(None, max_length=200, description="Condizioni pagamento")
    
    # Fatturazione elettronica
    xml_filename: Optional[str] = Field(None, max_length=200, description="Nome file XML")
    p7m_source_file: Optional[str] = Field(None, max_length=200, description="File P7M originale")
    transmission_id: Optional[str] = Field(None, max_length=50, description="ID trasmissione SdI")
    sdi_status: Optional[str] = Field(None, max_length=20, description="Stato SdI")
    
    # Regime fiscale
    vat_regime: VATRegime = Field(default=VATRegime.RF01, description="Regime fiscale")
    
    # Metadati
    notes: Optional[str] = Field(None, max_length=1000, description="Note")
    internal_reference: Optional[str] = Field(None, max_length=100, description="Riferimento interno")
    external_reference: Optional[str] = Field(None, max_length=100, description="Riferimento esterno")
    currency: str = Field(default="EUR", max_length=3, description="Valuta")
    exchange_rate: Optional[float] = Field(None, gt=0, description="Tasso di cambio")
    
    # Timestamps
    unique_hash: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Campi computati
    open_amount: Optional[float] = Field(None, description="Importo aperto")
    days_overdue: Optional[int] = Field(None, description="Giorni di ritardo")
    is_overdue: Optional[bool] = Field(None, description="È in ritardo")
    counterparty_name: Optional[str] = Field(None, description="Nome controparte")
    
    # Relazioni
    lines: List[InvoiceLineExtended] = Field(default=[], description="Righe fattura")
    vat_summary: List[InvoiceVATSummaryExtended] = Field(default=[], description="Riassunto IVA")
    attachments: List[InvoiceAttachment] = Field(default=[], description="Allegati")
    payments: List[InvoicePayment] = Field(default=[], description="Pagamenti")
    
    @validator('open_amount', pre=True, always=True)
    def calculate_open_amount(cls, v, values):
        if v is None and 'total_amount' in values and 'paid_amount' in values:
            return values['total_amount'] - values['paid_amount']
        return v


class InvoiceValidation(BaseModel, BaseConfig):
    """Risultati validazione fattura"""
    is_valid: bool
    errors: List[str] = Field(default=[], description="Errori critici")
    warnings: List[str] = Field(default=[], description="Avvertimenti")
    suggestions: List[str] = Field(default=[], description="Suggerimenti")
    
    # Validazioni specifiche
    totals_match: bool = Field(default=True, description="Totali coerenti")
    vat_calculation_correct: bool = Field(default=True, description="Calcolo IVA corretto")
    required_fields_present: bool = Field(default=True, description="Campi obbligatori presenti")
    format_compliance: bool = Field(default=True, description="Conformità formato")


class InvoiceStats(BaseModel, BaseConfig):
    """Statistiche fatture"""
    total_count: int = Field(default=0)
    active_count: int = Field(default=0)
    passive_count: int = Field(default=0)
    
    # Per stato
    open_count: int = Field(default=0)
    paid_count: int = Field(default=0)
    overdue_count: int = Field(default=0)
    partial_paid_count: int = Field(default=0)
    
    # Importi
    total_value: float = Field(default=0.0)
    total_paid: float = Field(default=0.0)
    total_outstanding: float = Field(default=0.0)
    average_invoice_value: float = Field(default=0.0)
    
    # Per periodo
    current_month_count: int = Field(default=0)
    current_month_value: float = Field(default=0.0)
    last_month_count: int = Field(default=0)
    last_month_value: float = Field(default=0.0)


class InvoiceSearch(BaseModel, BaseConfig):
    """Criteri di ricerca fatture"""
    query: Optional[str] = Field(None, max_length=200, description="Testo da cercare")
    invoice_types: Optional[List[InvoiceType]] = Field(None, description="Tipi fattura")
    payment_statuses: Optional[List[PaymentStatus]] = Field(None, description="Stati pagamento")
    anagraphics_ids: Optional[List[int]] = Field(None, description="IDs anagrafiche")
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    amount_min: Optional[float] = Field(None, ge=0)
    amount_max: Optional[float] = Field(None, ge=0)
    doc_numbers: Optional[List[str]] = Field(None, description="Numeri documento")
    has_xml: Optional[bool] = Field(None, description="Ha file XML")
    is_overdue: Optional[bool] = Field(None, description="È scaduta")
    
    # Ordinamento
    sort_by: str = Field(default="doc_date", description="Campo ordinamento")
    sort_order: str = Field(default="desc", description="Ordine: asc, desc")


class InvoiceBulkOperation(BaseModel, BaseConfig):
    """Operazione massiva su fatture"""
    invoice_ids: List[int] = Field(..., min_items=1, max_items=1000)
    operation: str = Field(..., description="Operazione da eseguire")
    parameters: Dict[str, Any] = Field(default={}, description="Parametri operazione")
    
    # Operazioni supportate:
    # - update_payment_status: {status: PaymentStatus, paid_amount?: float}
    # - update_due_date: {due_date: date}
    # - add_notes: {notes: str, append?: bool}
    # - mark_overdue: {}
    # - send_reminders: {template?: str}
    # - export: {format: str, include_attachments?: bool}


class InvoiceTemplate(BaseModel, BaseConfig):
    """Template per creazione fatture"""
    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    template_type: InvoiceType
    
    # Dati default
    default_due_days: int = Field(default=30, ge=0, le=365)
    default_payment_method: Optional[PaymentMethod] = None
    default_payment_terms: Optional[str] = None
    default_notes: Optional[str] = None
    
    # Righe template
    template_lines: List[Dict[str, Any]] = Field(default=[], description="Righe template")
    
    # Configurazione
    auto_numbering: bool = Field(default=True, description="Numerazione automatica")
    number_format: str = Field(default="{year}/{number:04d}", description="Formato numero")
    
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class InvoiceReminder(BaseModel, BaseConfig):
    """Sollecito fattura"""
    id: Optional[int] = None
    invoice_id: int
    reminder_level: int = Field(..., ge=1, le=5, description="Livello sollecito")
    sent_date: date
    sent_method: str = Field(..., description="Metodo invio: email, pec, post")
    recipient_email: Optional[str] = Field(None, max_length=200)
    subject: str = Field(..., max_length=200)
    message: str = Field(..., description="Testo sollecito")
    status: str = Field(default="Sent", description="Stato: Sent, Delivered, Read, Failed")
    response_received: bool = Field(default=False)
    response_date: Optional[date] = None
    response_notes: Optional[str] = Field(None, max_length=1000)
    next_reminder_date: Optional[date] = None


class InvoiceReport(BaseModel, BaseConfig):
    """Report fatture"""
    report_type: str = Field(..., description="Tipo report")
    period_from: date
    period_to: date
    filters: Dict[str, Any] = Field(default={})
    
    # Dati report
    summary: Dict[str, Any] = Field(default={})
    details: List[Dict[str, Any]] = Field(default=[])
    charts: List[Dict[str, Any]] = Field(default=[])
    
    generated_at: datetime = Field(default_factory=datetime.now)
    generated_by: Optional[str] = None


class ElectronicInvoiceData(BaseModel, BaseConfig):
    """Dati specifici fatturazione elettronica"""
    transmission_format: str = Field(default="FPR12", description="Formato trasmissione")
    progressive_number: int = Field(..., gt=0, description="Numero progressivo")
    
    # Dati trasmissione
    sender_country: str = Field(default="IT", max_length=2)
    sender_id: str = Field(..., max_length=28, description="Codice identificativo")
    sender_type: str = Field(default="CF", description="Tipo ID: CF, PIVA")
    
    # Destinatario
    recipient_country: str = Field(default="IT", max_length=2)
    recipient_id: str = Field(..., max_length=28)
    recipient_type: str = Field(default="CF", description="Tipo ID destinatario")
    destination_code: str = Field(default="0000000", max_length=7, description="Codice destinatario")
    certified_email: Optional[str] = Field(None, max_length=200, description="PEC destinatario")
    
    # Stati SDI
    transmission_date: Optional[datetime] = None
    receipt_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    acceptance_date: Optional[datetime] = None
    rejection_date: Optional[datetime] = None
    rejection_reason: Optional[str] = Field(None, max_length=500)


# Export all invoice models
__all__ = [
    'DocumentType', 'PaymentMethod', 'VATRegime', 'InvoiceLineExtended', 
    'InvoiceVATSummaryExtended', 'InvoiceAttachment', 'InvoicePayment',
    'InvoiceExtended', 'InvoiceValidation', 'InvoiceStats', 'InvoiceSearch',
    'InvoiceBulkOperation', 'InvoiceTemplate', 'InvoiceReminder', 'InvoiceReport',
    'ElectronicInvoiceData'
]
