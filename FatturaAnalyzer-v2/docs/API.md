# Riferimento API - FatturaAnalyzer v2

Questa documentazione descrive gli endpoint dell'API RESTful di FatturaAnalyzer.

**URL Base:** `http://127.0.0.1:8000`

### Autenticazione
(Se abilitata) L'API utilizza un API Key inviato tramite l'header `Authorization`.
`Authorization: Bearer <TUO_API_KEY>`

---

### Risposte Comuni

-   **Successo (200 OK):**
    ```json
    {
      "success": true,
      "message": "Operazione completata con successo",
      "data": { ... }
    }
    ```
-   **Errore (4xx/5xx):**
    ```json
    {
      "success": false,
      "error": "Tipo di Errore",
      "message": "Descrizione dell'errore"
    }
    ```
---

### 📌 Endpoint Principali

#### Anagrafiche (`/api/anagraphics`)
-   `GET /`: Lista paginata di clienti e fornitori.
-   `POST /`: Crea una nuova anagrafica.
-   `GET /{id}`: Ottieni dettagli di una singola anagrafica.
-   `PUT /{id}`: Aggiorna un'anagrafica.
-   `DELETE /{id}`: Elimina un'anagrafica.

#### Fatture (`/api/invoices`)
-   `GET /`: Lista paginata delle fatture.
-   `POST /`: Crea una nuova fattura.
-   `GET /{id}`: Ottieni dettagli di una singola fattura (incluse righe e riepilogo IVA).
-   `POST /{id}/update-payment-status`: Aggiorna lo stato di pagamento.

#### Movimenti (`/api/transactions`)
-   `GET /`: Lista paginata dei movimenti bancari.
-   `POST /`: Crea un nuovo movimento.
-   `GET /{id}`: Ottieni dettagli di un singolo movimento.
-   `GET /{id}/potential-matches`: Ottieni suggerimenti di fatture per un movimento.

#### Import/Export (`/api/import`)
-   `POST /invoices/xml`: Importa uno o più file di fatture XML/P7M.
-   `POST /transactions/csv`: Importa un file CSV di movimenti bancari.
-   `GET /templates/transactions-csv`: Scarica il template CSV.
-   `GET /export/{entity}`: Esporta dati (es. `invoices`, `transactions`) in vari formati (Excel, CSV, JSON).

---

### 🔥 Endpoint di Analytics Avanzati (`/api/analytics`)

Questa è la sezione più potente dell'API, che espone capacità di Business Intelligence.

-   **`GET /dashboard/executive`**: Fornisce un riepilogo di alto livello con insights automatici, analisi di stagionalità, segmentazione clienti e rischi di abbandono. Ideale per la C-level suite.
-   **`GET /dashboard/operations`**: Dashboard operativa per la gestione quotidiana. Include analisi su scarti/deperibilità, rotazione di inventario e performance dei fornitori.
-   **`GET /seasonality/products`**: **(ORO PER FRUTTA/VERDURA)** Analizza la stagionalità delle vendite dei prodotti, permettendo di ottimizzare acquisti e scorte.
-   **`GET /waste/analysis`**: Analizza gli scarti e il deterioramento dei prodotti, fondamentale per beni deperibili.
-   **`GET /inventory/turnover`**: Calcola l'indice di rotazione dell'inventario per identificare prodotti a lenta movimentazione.
-   **`GET /customers/rfm`**: Esegue una segmentazione avanzata dei clienti basata su Recency, Frequency, Monetary.
-   **`GET /customers/churn-risk`**: Identifica i clienti a rischio di abbandono e suggerisce azioni correttive.
-   **`GET /competitive/analysis`**: Confronta i prezzi di acquisto e vendita per analizzare i margini e la competitività.
-   **`GET /forecasting/sales`**: Fornisce previsioni di vendita basate sui trend storici.
-   **`GET /payments/behavior`**: Analizza il comportamento di pagamento dei clienti (es. ritardi medi).

---

### 🧠 Endpoint di Riconciliazione AI (`/api/reconciliation`)

-   **`GET /suggestions`**: Ottieni suggerimenti di riconciliazione generati dall'AI.
-   **`GET /client/{id}/suggestions`**: Ottieni suggerimenti specifici per un cliente, basati sui suoi pattern di pagamento storici.
-   **`POST /auto-reconcile`**: Avvia un processo di riconciliazione automatica per i match ad alta confidenza.
-   **`POST /reconcile`**: Applica manualmente un match tra una fattura e una transazione.
