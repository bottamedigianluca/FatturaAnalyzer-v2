import sys
import os
import requests
import json
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QTextEdit,
    QFileDialog, QProgressBar, QGroupBox, QFormLayout, QSplitter, QTabWidget,
    QTableWidget, QTableWidgetItem, QHeaderView, QLineEdit
)
from PySide6.QtCore import Qt, QThread, Signal, QTimer
from PySide6.QtGui import QColor, QFont

# Assicurati che il backend sia raggiungibile
BACKEND_URL = "http://127.0.0.1:8000"

# --- Worker Thread per non bloccare la GUI ---
class BackendWorker(QThread):
    response_received = Signal(object)
    error_occurred = Signal(str)

    def __init__(self, operation, params=None, file_path=None):
        super().__init__()
        self.operation = operation
        self.params = params or {}
        self.file_path = file_path

    def run(self):
        try:
            if self.operation == 'import_file':
                # Logica di importazione invariata...
                file_name = os.path.basename(self.file_path)
                _, ext = os.path.splitext(file_name)
                
                if ext.lower() in ['.xml', '.p7m']:
                    url = f"{BACKEND_URL}/api/import-export/invoices/xml"
                    with open(self.file_path, 'rb') as f:
                        files = {'files': (file_name, f.read(), 'application/octet-stream')}
                        response = requests.post(url, files=files, timeout=120)
                elif ext.lower() == '.zip':
                    url = f"{BACKEND_URL}/api/import-export/invoices/zip"
                    with open(self.file_path, 'rb') as f:
                        files = {'file': (file_name, f.read(), 'application/zip')}
                        response = requests.post(url, files=files, timeout=300)
                else:
                    self.error_occurred.emit(f"Tipo file non supportato: {ext}")
                    return

            elif self.operation == 'fetch_data':
                entity = self.params.get('entity')
                search_query = self.params.get('search', '')
                url_params = {'size': 1000, 'search': search_query}

                # Aggiungi filtro per tipo fattura se necessario
                if self.params.get('invoice_type'):
                    url_params['type_filter'] = self.params['invoice_type']

                url = f"{BACKEND_URL}/api/{entity}/"
                response = requests.get(url, params=url_params, timeout=60)
            else:
                self.error_occurred.emit(f"Operazione non supportata: {self.operation}")
                return

            response.raise_for_status()
            self.response_received.emit({'operation': self.operation, 'data': response.json()})

        except requests.exceptions.RequestException as e:
            self.error_occurred.emit(f"Errore di connessione: {e}")
        except Exception as e:
            self.error_occurred.emit(f"Errore imprevisto: {e}")


# --- Finestra Principale ---
class TestSuiteGUI(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("FatturaAnalyzer - GUI di Test Avanzata V3")
        self.setGeometry(100, 100, 1400, 900)
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout(self)
        self.tabs = QTabWidget()
        self.tabs.currentChanged.connect(self.on_tab_change)

        # Crea le tab
        self.import_tab = self.create_import_tab()
        self.invoices_passive_tab, self.passive_total_label = self.create_invoice_view_tab("Fatture Passive", "Passiva")
        self.invoices_active_tab, self.active_total_label = self.create_invoice_view_tab("Fatture Attive", "Attiva")
        self.anagraphics_tab = self.create_data_view_tab("Anagrafiche", "anagraphics")
        self.transactions_tab = self.create_data_view_tab("Movimenti", "transactions")

        self.tabs.addTab(self.import_tab, "1. Importazione")
        self.tabs.addTab(self.invoices_passive_tab, "Fatture Passive")
        self.tabs.addTab(self.invoices_active_tab, "Fatture Attive")
        self.tabs.addTab(self.anagraphics_tab, "Anagrafiche")
        self.tabs.addTab(self.transactions_tab, "Movimenti")

        main_layout.addWidget(self.tabs)

    # --- Creazione delle Tab ---
    def create_import_tab(self):
        # ... (Invariato dalla versione precedente)
        tab = QWidget()
        layout = QVBoxLayout(tab)
        controls_group = QGroupBox("Controlli Importazione")
        controls_layout = QVBoxLayout()
        self.select_button = QPushButton("Seleziona File (XML, P7M, ZIP)...")
        self.select_button.clicked.connect(self.select_file)
        self.file_label = QLabel("Nessun file selezionato")
        self.file_label.setStyleSheet("font-style: italic; color: grey;")
        self.import_button = QPushButton("Invia al Backend per l'Importazione")
        self.import_button.clicked.connect(self.start_import)
        self.import_button.setEnabled(False)
        self.import_button.setStyleSheet("font-size: 14px; padding: 10px; background-color: #3b82f6; color: white;")
        controls_layout.addWidget(self.select_button)
        controls_layout.addWidget(self.file_label)
        controls_layout.addWidget(self.import_button)
        controls_group.setLayout(controls_layout)
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        results_group = QGroupBox("Log Risultati Importazione")
        results_layout = QVBoxLayout()
        self.log_output = QTextEdit()
        self.log_output.setReadOnly(True)
        self.log_output.setFontFamily("Courier")
        results_layout.addWidget(self.log_output)
        results_group.setLayout(results_layout)
        layout.addWidget(controls_group)
        layout.addWidget(self.progress_bar)
        layout.addWidget(results_group)
        return tab

    def create_invoice_view_tab(self, title, invoice_type):
        tab = QWidget()
        layout = QVBoxLayout(tab)

        # Controlli e Totali
        header_layout = QHBoxLayout()
        search_box = QLineEdit()
        search_box.setPlaceholderText(f"Cerca in {title}...")
        search_box.returnPressed.connect(lambda: self.fetch_data("invoices", search_box.text(), invoice_type))
        refresh_button = QPushButton("Aggiorna Dati")
        refresh_button.clicked.connect(lambda: self.fetch_data("invoices", search_box.text(), invoice_type))
        
        total_label = QLabel("Totale Importi: € 0.00")
        total_label.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        total_label.setStyleSheet("color: #1e40af;")
        
        header_layout.addWidget(QLabel("Filtro:"))
        header_layout.addWidget(search_box)
        header_layout.addWidget(refresh_button)
        header_layout.addStretch()
        header_layout.addWidget(total_label)

        # Tabella
        table = QTableWidget()
        table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        table.setAlternatingRowColors(True)

        setattr(self, f"invoices_{invoice_type.lower()}_table", table)
        setattr(self, f"invoices_{invoice_type.lower()}_search_box", search_box)

        layout.addLayout(header_layout)
        layout.addWidget(table)
        return tab, total_label

    def create_data_view_tab(self, title, entity_name):
        # ... (Invariato, ma ora usato per Anagrafiche e Movimenti)
        tab = QWidget()
        layout = QVBoxLayout(tab)
        controls_layout = QHBoxLayout()
        search_box = QLineEdit()
        search_box.setPlaceholderText(f"Cerca in {title}...")
        search_box.returnPressed.connect(lambda: self.fetch_data(entity_name, search_box.text()))
        refresh_button = QPushButton("Aggiorna Dati")
        refresh_button.clicked.connect(lambda: self.fetch_data(entity_name, search_box.text()))
        controls_layout.addWidget(QLabel("Filtro:"))
        controls_layout.addWidget(search_box)
        controls_layout.addWidget(refresh_button)
        table = QTableWidget()
        table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        table.setAlternatingRowColors(True)
        setattr(self, f"{entity_name}_table", table)
        setattr(self, f"{entity_name}_search_box", search_box)
        layout.addLayout(controls_layout)
        layout.addWidget(table)
        return tab

    # --- Logica e Gestori Eventi ---
    
    def on_tab_change(self, index):
        tab_name = self.tabs.tabText(index)
        if "Passive" in tab_name:
            self.fetch_data("invoices", invoice_type="Passiva")
        elif "Attive" in tab_name:
            self.fetch_data("invoices", invoice_type="Attiva")
        elif "Anagrafiche" in tab_name:
            self.fetch_data("anagraphics")
        elif "Movimenti" in tab_name:
            self.fetch_data("transactions")

    def fetch_data(self, entity, search_text="", invoice_type=None):
        self.log_output.setText(f"Caricamento dati per '{entity}'...")
        self.tabs.setEnabled(False)

        params = {'entity': entity, 'search': search_text}
        if invoice_type:
            params['invoice_type'] = invoice_type
            
        self.worker = BackendWorker(operation='fetch_data', params=params)
        self.worker.response_received.connect(self.on_worker_response)
        self.worker.error_occurred.connect(self.on_worker_error)
        self.worker.start()

    def on_worker_response(self, response):
        operation = response.get('operation')
        data = response.get('data')

        if operation == 'import_file':
            self.reset_import_ui()
            self.log_output.setText(json.dumps(data, indent=2, ensure_ascii=False))
            QTimer.singleShot(500, lambda: self.tabs.setCurrentIndex(1))

        elif operation == 'fetch_data':
            entity = self.worker.params.get('entity')
            invoice_type = self.worker.params.get('invoice_type')
            items = data.get('items', [])
            
            if entity == "invoices" and invoice_type:
                self.populate_table(f"invoices_{invoice_type.lower()}", items)
            else:
                self.populate_table(entity, items)
                
            self.tabs.setEnabled(True)
            self.log_output.clear()

    def populate_table(self, entity_key, items):
        table = getattr(self, f"{entity_key}_table", None)
        if not table: return

        table.clear()
        table.setRowCount(0)

        if not items:
            table.setColumnCount(1)
            table.setHorizontalHeaderLabels(["Info"])
            table.setRowCount(1)
            table.setItem(0,0, QTableWidgetItem("Nessun dato da visualizzare."))
            return

        # Calcola totale per le fatture
        if "invoices" in entity_key:
            total_amount = sum(float(item.get('total_amount', 0)) for item in items)
            label_to_update = getattr(self, f"{entity_key.split('_')[1]}_total_label", None)
            if label_to_update:
                label_to_update.setText(f"Totale Importi: € {total_amount:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'))

        # Popola la tabella
        headers = list(items[0].keys())
        table.setColumnCount(len(headers))
        table.setHorizontalHeaderLabels(headers)

        table.setRowCount(len(items))
        for row, item in enumerate(items):
            for col, key in enumerate(headers):
                value = item.get(key)
                
                # --- Logica di formattazione celle ---
                if isinstance(value, list) or isinstance(value, dict):
                     # Per 'lines' e 'vat_summary', mostra un simbolo e un tooltip
                    cell_text = f"[{len(value)}]" if value else "[]"
                    widget_item = QTableWidgetItem(cell_text)
                    widget_item.setToolTip(json.dumps(value, indent=2))
                elif isinstance(value, float):
                    # Formatta i numeri float come valuta
                    cell_text = f"{value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
                    widget_item = QTableWidgetItem(cell_text)
                    widget_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
                else:
                    widget_item = QTableWidgetItem(str(value) if value is not None else "")
                
                table.setItem(row, col, widget_item)
        
        table.resizeColumnsToContents()

    def on_worker_error(self, error_message):
        self.reset_import_ui()
        self.tabs.setEnabled(True)
        self.log_output.setText(f"ERRORE:\n{error_message}")

    def select_file(self):
        # ... (Invariato)
        file_path, _ = QFileDialog.getOpenFileName(self, "Seleziona File da Importare", "", "File Fatture (*.xml *.p7m *.zip);;Tutti i file (*)")
        if file_path:
            self.file_path = file_path
            self.file_label.setText(os.path.basename(file_path))
            self.file_label.setStyleSheet("font-style: normal; color: black;")
            self.import_button.setEnabled(True)
            self.log_output.clear()

    def start_import(self):
        # ... (Invariato)
        self.import_button.setEnabled(False)
        self.select_button.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)
        self.log_output.setText("Invio richiesta al backend...")
        self.worker = BackendWorker(operation='import_file', file_path=self.file_path)
        self.worker.response_received.connect(self.on_worker_response)
        self.worker.error_occurred.connect(self.on_worker_error)
        self.worker.start()

    def reset_import_ui(self):
        # ... (Invariato)
        self.import_button.setEnabled(True)
        self.select_button.setEnabled(True)
        self.progress_bar.setVisible(False)
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    tester = TestSuiteGUI()
    tester.show()
    sys.exit(app.exec())
