# FatturaAnalyzer v2 - Documentazione Completa

**FatturaAnalyzer v2** è un'applicazione software completa e moderna per la gestione finanziaria e l'analisi di business, progettata specificamente per le aziende italiane. Basata su un'architettura robusta e scalabile, l'applicazione offre strumenti avanzati per l'importazione di fatture, la riconciliazione bancaria e, soprattutto, un motore di **Business Intelligence** estremamente potente, ideale per aziende nel settore commerciale, come l'ingrosso di prodotti freschi (frutta e verdura).

---

### ✨ Funzionalità Principali

-   **Gestione Completa:** Anagrafiche (clienti/fornitori), fatture (attive/passive) e movimenti bancari.
-   **Importazione Dati:** Supporto per fatture elettroniche (XML, P7M) e estratti conto bancari (CSV).
-   **Riconciliazione Intelligente:** Motore di riconciliazione avanzato che abbina automaticamente fatture e transazioni, con suggerimenti basati su AI e pattern storici dei clienti.
-   **Analytics e Business Intelligence:**
    -   Dashboard multiple (Executive, Operativa, Finanziaria).
    -   Calcolo di KPI finanziari e operativi.
    -   Analisi di profittabilità, cash flow, e trend di fatturato.
    -   **Analisi specifiche per il settore:** stagionalità dei prodotti, tracciamento di scarti e deperibilità, analisi della concorrenza sui prezzi.
    -   **Customer Intelligence:** Segmentazione clienti (RFM), analisi del rischio di abbandono (churn) e scoring.
-   **Sincronizzazione Cloud:** Backup e sincronizzazione sicura del database tramite Google Drive.
-   **API Robusta e Sicura:** Backend basato su FastAPI con autenticazione, rate limiting e gestione degli errori.
-   **Applicazione Desktop:** Interfaccia utente moderna e reattiva, disponibile come applicazione desktop nativa grazie a Tauri.

---

### 🏛️ Architettura

Il progetto segue un'architettura a **monorepo** ben definita, separando chiaramente le responsabilità:

-   **Backend (Python/FastAPI):** Il cuore logico. È strutturato a 3 livelli per massima manutenibilità:
    1.  `Core`: Logica di business pura, indipendente dal framework.
    2.  `Adapters`: Strato che adatta la logica del Core per l'uso asincrono da parte dell'API.
    3.  `API`: Espone gli endpoint RESTful, gestisce le richieste e la validazione.
-   **Frontend (React/TypeScript):** L'interfaccia utente, costruita con Vite, React, e TailwindCSS.
-   **Desktop (Tauri/Rust):** Un wrapper leggero che impacchetta il frontend in un'applicazione nativa per Windows, macOS e Linux.

 <!-- Immagine placeholder -->

---

### 🛠️ Stack Tecnologico

-   **Backend:** Python 3.11+, FastAPI, Pydantic, SQLAlchemy (usato implicitamente con Pandas su SQLite), Pandas.
-   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand, React Query.
-   **Desktop:** Tauri, Rust.
-   **Database:** SQLite.
-   **Containerization:** Docker, Docker Compose.
-   **Tooling:** Makefile, Pytest.

---

### 🚀 Guida Rapida

Per installare e avviare il progetto, segui le istruzioni dettagliate nel file [**SETUP.md**](./docs/SETUP.md).

Per un riferimento completo degli endpoint disponibili, consulta la documentazione [**API.md**](./docs/API.md).

---

### 📄 Licenza

Questo progetto è distribuito sotto la licenza MIT. Vedi il file `LICENSE` per maggiori dettagli.
