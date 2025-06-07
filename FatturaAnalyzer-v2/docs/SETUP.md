# Guida all'Installazione e Avvio di FatturaAnalyzer v2

Questa guida descrive i passaggi necessari per configurare e avviare l'applicazione in un ambiente di sviluppo.

### 📋 Prerequisiti

Assicurati di avere installato i seguenti strumenti:
-   **Python** (versione 3.9 o superiore) e `pip`.
-   **Node.js** (versione 18 o superiore) e `npm`.
-   **Rust** e `cargo` (necessari per buildare l'app Tauri). Segui la [guida ufficiale di Tauri](https://tauri.app/v1/guides/getting-started/prerequisites).
-   **Docker** e **Docker Compose** (opzionale, per l'avvio tramite container).
-   **Git** per clonare il repository.

### ⚙️ Installazione

1.  **Clona il Repository**
    ```bash
    git clone https://github.com/tuo-utente/FatturaAnalyzer-v2.git
    cd FatturaAnalyzer-v2-main/FatturaAnalyzer-v2
    ```

2.  **Configurazione del Backend**
    -   Naviga nella cartella `backend`: `cd backend`
    -   Crea un ambiente virtuale: `python -m venv venv`
    -   Attiva l'ambiente virtuale:
        -   Windows: `venv\Scripts\activate`
        -   macOS/Linux: `source venv/bin/activate`
    -   Installa le dipendenze Python:
        ```bash
        pip install -r requirements.txt
        ```

3.  **Configurazione del Frontend**
    -   Naviga nella cartella `frontend`: `cd ../frontend`
    -   Installa le dipendenze Node.js:
        ```bash
        npm install
        ```

4.  **Configurazione Variabili d'Ambiente**
    -   Nella cartella `backend`, copia il file `.env.example` in un nuovo file chiamato `.env`.
        ```bash
        cp .env.example .env
        ```
    -   Modifica il file `.env` se necessario (le impostazioni di default sono adatte per lo sviluppo locale).

### ▶️ Avvio dell'Applicazione

#### 1. Sviluppo Locale (Backend + Frontend)

Questo è il metodo raccomandato per lo sviluppo.

-   **Avvia il Backend:**
    -   Apri un terminale nella cartella `backend`.
    -   Assicurati che l'ambiente virtuale sia attivo.
    -   Esegui il server con:
        ```bash
        make dev
        # In alternativa: python scripts/start_dev.py
        ```
    -   Il backend sarà in ascolto su `http://127.0.0.1:8000`.

-   **Avvia il Frontend:**
    -   Apri un **secondo** terminale nella cartella `frontend`.
    -   Esegui il server di sviluppo Vite:
        ```bash
        npm run dev
        ```
    -   L'interfaccia utente sarà accessibile su `http://localhost:1420` (o un'altra porta indicata da Vite).

#### 2. Sviluppo con Tauri (App Desktop)

Questo metodo avvia l'applicazione desktop che wrappa il frontend e comunica con il backend.
-   **Avvia il Backend** come descritto sopra.
-   **Avvia l'app Tauri:**
    -   Apri un terminale nella cartella `frontend`.
    -   Esegui il comando:
        ```bash
        npm run tauri dev
        ```
    -   Questo comando avvierà il frontend e l'applicazione desktop Tauri.

#### 3. Sviluppo con Docker

Questo metodo containerizza il backend per un ambiente isolato.
-   **Avvia i container:**
    -   Dalla root della cartella `backend`, esegui:
        ```bash
        docker-compose up --build
        ```
    -   Questo comando builda l'immagine Docker (se non esiste) e avvia il container del backend.
-   **Avvia il Frontend** come descritto nel metodo di sviluppo locale.

### 🧙‍♂️ Primo Avvio (First Run Wizard)

Al primo avvio, l'applicazione rileverà una configurazione mancante.
1.  **Avvia il backend e il frontend.**
2.  Accedi all'URL del frontend (es. `http://localhost:1420`).
3.  Verrà visualizzato un **wizard di setup** che ti guiderà nella configurazione iniziale:
    -   Creazione del file `config.ini`.
    -   Inizializzazione del database.
    -   Inserimento dei dati aziendali base (puoi anche caricarli da una fattura XML).
4.  Una volta completato il wizard, l'applicazione sarà pronta all'uso.
