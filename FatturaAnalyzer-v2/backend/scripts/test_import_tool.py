import sys
import os
import requests
import json
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QPushButton, QLabel, QTextEdit,
    QFileDialog, QProgressBar, QGroupBox, QFormLayout, QSplitter, QTabWidget,
    QTableWidget, QTableWidgetItem, QHeaderView, QLineEdit, QHBoxLayout
)
from PySide6.QtCore import Qt, QThread, Signal, QTimer

# Assicurati che il backend sia raggiungibile
BACKEND_URL = "http://127.0.0.1:8000"

class BackendWorker(QThread):
    """Worker per eseguire richieste di rete senza bloccare la GUI."""
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
                file_name = os.path.basename(self.file_path)
                _, ext = os.path.splitext(file_name)
                
                if ext.lower() in ['.xml', '.p7m']:
                    url = f"{BACKEND_URL}/api/import-export/invoices/xml"
                    with open(self.file_path, 'rb') as f:
                        files = {'files': (file_name, f.read(), 'application/octet-stream')}
                        response = requests.post(url, files=files, timeout=120)
                elif ext.lower() == '.zip':
                    url = f"{BACKEND_URL}/api/import-export/invoices/zip" # Assumiamo ZIP di fatture
                    with open(self.file_path, 'rb') as f:
                        files = {'file': (file_name, f.read(), 'application/zip')}
                        response = requests.post(url, files=files, timeout=300)
                else:
                    self.error_occurred.emit(f"Tipo file non supportato: {ext}")
                    return
            elif self.operation == 'fetch_data':
                entity = self.params.get('entity')
                search_query = self.params.get('search', '')
                url = f"{BACKEND_URL}/api/{entity}/?size=1000&search={search_query}"
                response = requests.get(url, timeout=60)
            else:
                self.error_occurred.emit(f"Operazione non supportata: {self.operation}")
                return

            response.raise_for_status()
            self.response_received.emit({'operation': self.operation, 'data': response.json()})

        except requests.exceptions.RequestException as e:
            self.error_occurred.emit(f"Errore di connessione: {e}")
        except Exception as e:
            self.error_occurred.emit(f"Errore imprevisto: {e}")


class TestSuiteGUI(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("FatturaAnalyzer - GUI di Test Integrata")
        self.setGeometry(100, 100, 1200, 800)
        self.init_ui()
        self.worker = None

    def init_ui(self):
        main_layout = QVBoxLayout(self)
        self.tabs = QTabWidget()
        self.tabs.currentChanged.connect(self.on_tab_change)

        # Crea le tab
        self.import_tab = self.create_import_tab()
        self.anagraphics_tab = self.create_data_view_tab("Anagrafiche", "anagraphics")
        self.invoices_tab = self.create_data_view_tab("Fatture", "invoices")

        self.tabs.addTab(self.import_tab, "1. Importazione")
        self.tabs.addTab(self.anagraphics_tab, "2. Anagrafiche Importate")
        self.tabs.addTab(self.invoices_tab, "3. Fatture Importate")

        main_layout.addWidget(self.tabs)

    # --- Tab di Importazione ---
    def create_import_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)

        # Selezione e Azione
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

        # Progress Bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        
        # Risultati
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

    # --- Tab di Visualizzazione Dati (generica) ---
    def create_data_view_tab(self, title, entity_name):
        tab = QWidget()
        layout = QVBoxLayout(tab)

        # Controlli
        controls_layout = QHBoxLayout()
        search_box = QLineEdit()
        search_box.setPlaceholderText(f"Cerca in {title}...")
        
        # Uso di una lambda per passare argomenti al metodo
        search_box.returnPressed.connect(lambda: self.fetch_data(entity_name, search_box.text()))
        
        refresh_button = QPushButton("Aggiorna Dati")
        refresh_button.clicked.connect(lambda: self.fetch_data(entity_name, search_box.text()))
        
        controls_layout.addWidget(QLabel("Filtro:"))
        controls_layout.addWidget(search_box)
        controls_layout.addWidget(refresh_button)

        # Tabella
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
        """Chiamato quando si cambia tab, per aggiornare i dati."""
        tab_name = self.tabs.tabText(index)
        if "Anagrafiche" in tab_name:
            self.fetch_data("anagraphics")
        elif "Fatture" in tab_name:
            self.fetch_data("invoices")
    
    def select_file(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Seleziona File da Importare", "", "File Fatture (*.xml *.p7m *.zip);;Tutti i file (*)")
        if file_path:
            self.file_path = file_path
            self.file_label.setText(os.path.basename(file_path))
            self.file_label.setStyleSheet("font-style: normal; color: black;")
            self.import_button.setEnabled(True)
            self.log_output.clear()

    def start_import(self):
        self.import_button.setEnabled(False)
        self.select_button.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)
        self.log_output.setText("Invio richiesta al backend...")

        self.worker = BackendWorker(operation='import_file', file_path=self.file_path)
        self.worker.response_received.connect(self.on_worker_response)
        self.worker.error_occurred.connect(self.on_worker_error)
        self.worker.start()

    def fetch_data(self, entity, search_text=""):
        self.log_output.setText(f"Caricamento dati per '{entity}'...")
        self.tabs.setEnabled(False)

        params = {'entity': entity, 'search': search_text}
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
            # Passa automaticamente alla tab delle anagrafiche dopo un import di successo
            QTimer.singleShot(500, lambda: self.tabs.setCurrentIndex(1))

        elif operation == 'fetch_data':
            entity = self.worker.params.get('entity')
            self.populate_table(entity, data.get('items', []))
            self.tabs.setEnabled(True)
            self.log_output.clear()

    def on_worker_error(self, error_message):
        self.reset_import_ui()
        self.tabs.setEnabled(True)
        self.log_output.setText(f"ERRORE:\n{error_message}")

    def populate_table(self, entity, items):
        table = getattr(self, f"{entity}_table")
        table.clearContents()
        table.setRowCount(0)

        if not items:
            return

        headers = list(items[0].keys())
        table.setColumnCount(len(headers))
        table.setHorizontalHeaderLabels(headers)

        table.setRowCount(len(items))
        for row, item in enumerate(items):
            for col, key in enumerate(headers):
                value = item.get(key)
                # Semplice conversione per visualizzazione
                cell_value = str(value) if value is not None else ""
                table.setItem(row, col, QTableWidgetItem(cell_value))
        
        table.resizeColumnsToContents()

    def reset_import_ui(self):
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
