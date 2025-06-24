import sys
import os
import requests
import json
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QPushButton, QLabel, QTextEdit,
    QFileDialog, QProgressBar, QGroupBox, QFormLayout, QSplitter
)
from PySide6.QtCore import Qt, QThread, Signal

# Assicurati che il backend sia raggiungibile
BACKEND_URL = "http://127.0.0.1:8000"

class BackendWorker(QThread):
    """Worker per eseguire richieste di rete senza bloccare la GUI."""
    response_received = Signal(object)
    error_occurred = Signal(str)

    def __init__(self, file_path):
        super().__init__()
        self.file_path = file_path

    def run(self):
        try:
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
                    response = requests.post(url, files=files, timeout=180)
            else:
                self.error_occurred.emit(f"Tipo file non supportato: {ext}")
                return

            response.raise_for_status()  # Lancia un'eccezione per status code 4xx/5xx
            self.response_received.emit(response.json())

        except requests.exceptions.RequestException as e:
            self.error_occurred.emit(f"Errore di connessione: {e}")
        except Exception as e:
            self.error_occurred.emit(f"Errore imprevisto: {e}")


class ImportTester(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("FatturaAnalyzer - Test Tool di Importazione")
        self.setGeometry(100, 100, 800, 600)
        self.init_ui()
        self.worker = None

    def init_ui(self):
        main_layout = QVBoxLayout(self)
        
        # Selezione File
        file_group = QGroupBox("1. Seleziona File")
        file_layout = QVBoxLayout()
        self.select_button = QPushButton("Seleziona File (XML, P7M, ZIP)...")
        self.select_button.clicked.connect(self.select_file)
        self.file_label = QLabel("Nessun file selezionato")
        self.file_label.setStyleSheet("font-style: italic; color: grey;")
        file_layout.addWidget(self.select_button)
        file_layout.addWidget(self.file_label)
        file_group.setLayout(file_layout)

        # Bottone Azione
        self.import_button = QPushButton("2. Invia al Backend per l'Importazione")
        self.import_button.clicked.connect(self.start_import)
        self.import_button.setEnabled(False)
        self.import_button.setStyleSheet("font-size: 14px; padding: 10px; background-color: #3b82f6; color: white;")

        # Progress Bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        
        # Risultati
        results_group = QGroupBox("Risultati")
        results_layout = QVBoxLayout()
        splitter = QSplitter(Qt.Orientation.Vertical)
        
        # Status
        status_form = QFormLayout()
        self.status_label = QLabel("In attesa...")
        self.status_label.setStyleSheet("font-weight: bold;")
        status_form.addRow("Stato:", self.status_label)
        status_widget = QWidget()
        status_widget.setLayout(status_form)

        # Log
        self.log_output = QTextEdit()
        self.log_output.setReadOnly(True)
        self.log_output.setFontFamily("Courier")
        
        splitter.addWidget(status_widget)
        splitter.addWidget(self.log_output)
        splitter.setSizes([100, 500])
        results_layout.addWidget(splitter)
        results_group.setLayout(results_layout)

        main_layout.addWidget(file_group)
        main_layout.addWidget(self.import_button)
        main_layout.addWidget(self.progress_bar)
        main_layout.addWidget(results_group)

    def select_file(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Seleziona Fattura", "", "File Fatture (*.xml *.p7m *.zip);;Tutti i file (*)")
        if file_path:
            self.file_path = file_path
            self.file_label.setText(os.path.basename(file_path))
            self.file_label.setStyleSheet("font-style: normal; color: black;")
            self.import_button.setEnabled(True)
            self.log_output.clear()
            self.status_label.setText("Pronto per l'invio.")

    def start_import(self):
        self.import_button.setEnabled(False)
        self.select_button.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0) # Stile "busy"
        self.status_label.setText("Elaborazione in corso...")
        self.log_output.setText("Invio richiesta al backend...")

        self.worker = BackendWorker(self.file_path)
        self.worker.response_received.connect(self.on_response)
        self.worker.error_occurred.connect(self.on_error)
        self.worker.start()

    def on_response(self, data):
        self.reset_ui()
        success = data.get('success', True) # Default a True per compatibilità
        
        if success:
            self.status_label.setText("✅ Importazione Completata")
            self.status_label.setStyleSheet("font-weight: bold; color: green;")
        else:
            self.status_label.setText(f"⚠️ Importazione con errori: {data.get('message', '')}")
            self.status_label.setStyleSheet("font-weight: bold; color: orange;")

        pretty_json = json.dumps(data, indent=2, ensure_ascii=False)
        self.log_output.setText(pretty_json)
        
    def on_error(self, error_message):
        self.reset_ui()
        self.status_label.setText("❌ Errore Critico")
        self.status_label.setStyleSheet("font-weight: bold; color: red;")
        self.log_output.setText(error_message)

    def reset_ui(self):
        self.import_button.setEnabled(True)
        self.select_button.setEnabled(True)
        self.progress_bar.setVisible(False)
        self.progress_bar.setRange(0, 100)
        self.progress_bar.setValue(0)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    tester = ImportTester()
    tester.show()
    sys.exit(app.exec())
