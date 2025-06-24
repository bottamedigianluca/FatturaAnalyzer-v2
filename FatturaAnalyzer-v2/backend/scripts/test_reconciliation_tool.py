import sys
import requests
import json
from PySide6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QTextEdit,
    QTableWidget, QTableWidgetItem, QHeaderView, QSplitter, QGroupBox, QLineEdit,
    QComboBox, QSpinBox, QDoubleSpinBox
)
from PySide6.QtCore import Qt, QThread, Signal

# Assicurati che il backend sia raggiungibile
BACKEND_URL = "http://127.0.0.1:8000"

class ReconWorker(QThread):
    """Worker per richieste di riconciliazione."""
    suggestions_ready = Signal(object)
    manual_match_ready = Signal(object)
    error_occurred = Signal(str)

    def __init__(self, operation, params=None):
        super().__init__()
        self.operation = operation
        self.params = params or {}

    def run(self):
        try:
            if self.operation == "get_suggestions":
                url = f"{BACKEND_URL}/api/reconciliation/suggestions"
                response = requests.get(url, params=self.params, timeout=60)
                response.raise_for_status()
                self.suggestions_ready.emit(response.json())
            elif self.operation == "manual_match":
                url = f"{BACKEND_URL}/api/reconciliation/reconcile"
                response = requests.post(url, json=self.params, timeout=30)
                response.raise_for_status()
                self.manual_match_ready.emit(response.json())

        except requests.exceptions.RequestException as e:
            self.error_occurred.emit(f"Errore di connessione: {e}")
        except Exception as e:
            self.error_occurred.emit(f"Errore imprevisto: {e}")

class ReconciliationTester(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("FatturaAnalyzer - Test Tool di Riconciliazione")
        self.setGeometry(150, 150, 1200, 800)
        self.init_ui()

    def init_ui(self):
        main_layout = QVBoxLayout(self)
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # Pannello Sinistro: Controlli
        controls_panel = self.create_controls_panel()
        splitter.addWidget(controls_panel)

        # Pannello Destro: Risultati
        results_panel = self.create_results_panel()
        splitter.addWidget(results_panel)
        
        splitter.setSizes([350, 850])
        main_layout.addWidget(splitter)
        self.setLayout(main_layout)

    def create_controls_panel(self):
        panel = QWidget()
        layout = QVBoxLayout(panel)

        # Gruppo Suggerimenti
        suggestions_group = QGroupBox("1. Ottieni Suggerimenti")
        sugg_layout = QFormLayout()
        self.confidence_combo = QComboBox()
        self.confidence_combo.addItems(["Tutti", "Alta", "Media", "Bassa"])
        self.max_suggestions_spin = QSpinBox()
        self.max_suggestions_spin.setRange(5, 100)
        self.max_suggestions_spin.setValue(20)
        self.get_suggestions_button = QPushButton("Carica Suggerimenti")
        self.get_suggestions_button.clicked.connect(self.fetch_suggestions)
        sugg_layout.addRow("Confidenza Minima:", self.confidence_combo)
        sugg_layout.addRow("Max Suggerimenti:", self.max_suggestions_spin)
        sugg_layout.addWidget(self.get_suggestions_button)
        suggestions_group.setLayout(sugg_layout)

        # Gruppo Riconciliazione Manuale
        manual_group = QGroupBox("2. Riconcilia Manualmente")
        manual_layout = QFormLayout()
        self.invoice_id_spin = QSpinBox()
        self.invoice_id_spin.setRange(1, 99999)
        self.transaction_id_spin = QSpinBox()
        self.transaction_id_spin.setRange(1, 99999)
        self.amount_spin = QDoubleSpinBox()
        self.amount_spin.setRange(0.01, 999999.99)
        self.amount_spin.setDecimals(2)
        self.amount_spin.setSingleStep(0.01)
        self.manual_match_button = QPushButton("Applica Match")
        self.manual_match_button.clicked.connect(self.apply_manual_match)
        manual_layout.addRow("ID Fattura:", self.invoice_id_spin)
        manual_layout.addRow("ID Transazione:", self.transaction_id_spin)
        manual_layout.addRow("Importo:", self.amount_spin)
        manual_layout.addWidget(self.manual_match_button)
        manual_group.setLayout(manual_layout)

        layout.addWidget(suggestions_group)
        layout.addWidget(manual_group)
        layout.addStretch()
        return panel

    def create_results_panel(self):
        panel = QWidget()
        layout = QVBoxLayout(panel)

        # Tabella Suggerimenti
        self.suggestions_table = QTableWidget()
        self.suggestions_table.setColumnCount(5)
        self.suggestions_table.setHorizontalHeaderLabels(["Confidenza", "Importo", "Descrizione", "Fatture ID", "Transazioni ID"])
        self.suggestions_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.suggestions_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.suggestions_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.suggestions_table.itemSelectionChanged.connect(self.on_suggestion_select)

        # Log JSON
        self.json_log = QTextEdit()
        self.json_log.setReadOnly(True)
        self.json_log.setFontFamily("Courier")

        layout.addWidget(QLabel("Suggerimenti di Riconciliazione:"))
        layout.addWidget(self.suggestions_table)
        layout.addWidget(QLabel("Dettaglio Risposta JSON:"))
        layout.addWidget(self.json_log)
        return panel

    def fetch_suggestions(self):
        self.json_log.setText("Caricamento suggerimenti...")
        params = {"limit": self.max_suggestions_spin.value()}
        confidence = self.confidence_combo.currentText()
        if confidence != "Tutti":
            params["confidence"] = confidence
        
        self.worker = ReconWorker("get_suggestions", params)
        self.worker.suggestions_ready.connect(self.on_suggestions_ready)
        self.worker.error_occurred.connect(self.on_error)
        self.worker.start()

    def on_suggestions_ready(self, data):
        self.json_log.setText(json.dumps(data, indent=2, ensure_ascii=False))
        suggestions = data.get('data', {}).get('suggestions', [])
        self.suggestions_table.setRowCount(len(suggestions))

        for row, item in enumerate(suggestions):
            self.suggestions_table.setItem(row, 0, QTableWidgetItem(f"{item.get('confidence')} ({item.get('confidence_score', 0):.2f})"))
            self.suggestions_table.setItem(row, 1, QTableWidgetItem(f"€ {item.get('total_amount', 0):.2f}"))
            self.suggestions_table.setItem(row, 2, QTableWidgetItem(item.get('description', '')))
            self.suggestions_table.setItem(row, 3, QTableWidgetItem(str(item.get('invoice_ids', []))))
            self.suggestions_table.setItem(row, 4, QTableWidgetItem(str(item.get('transaction_ids', []))))

    def apply_manual_match(self):
        self.json_log.setText("Applico match manuale...")
        params = {
            "invoice_id": self.invoice_id_spin.value(),
            "transaction_id": self.transaction_id_spin.value(),
            "amount": self.amount_spin.value()
        }
        self.worker = ReconWorker("manual_match", params)
        self.worker.manual_match_ready.connect(self.on_manual_match_ready)
        self.worker.error_occurred.connect(self.on_error)
        self.worker.start()

    def on_manual_match_ready(self, data):
        self.json_log.setText(json.dumps(data, indent=2, ensure_ascii=False))
        if data.get('success'):
            self.fetch_suggestions() # Ricarica i suggerimenti

    def on_suggestion_select(self):
        selected_items = self.suggestions_table.selectedItems()
        if not selected_items:
            return
        
        row = selected_items[0].row()
        try:
            invoices = json.loads(self.suggestions_table.item(row, 3).text())
            transactions = json.loads(self.suggestions_table.item(row, 4).text())
            amount_str = self.suggestions_table.item(row, 1).text().replace('€', '').strip()
            amount = float(amount_str.replace(',', '.'))

            if invoices and transactions:
                self.invoice_id_spin.setValue(invoices[0])
                self.transaction_id_spin.setValue(transactions[0])
                self.amount_spin.setValue(amount)
        except (json.JSONDecodeError, IndexError, ValueError) as e:
            print(f"Errore nel popolare i campi dal suggerimento: {e}")

    def on_error(self, error_message):
        self.json_log.setText(f"ERRORE:\n{error_message}")


if __name__ == '__main__':
    app = QApplication(sys.argv)
    tester = ReconciliationTester()
    tester.show()
    sys.exit(app.exec())
