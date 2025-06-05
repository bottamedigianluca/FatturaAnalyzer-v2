[Paths]
# Percorso del file database SQLite. Può essere relativo alla directory del backend.
# Esempio: data/database.db (creerà una cartella 'data' nel backend)
# Oppure un percorso assoluto: /percorso/assoluto/al/tuo/database.db
DatabaseFile = data/fattura_analyzer.db

# Percorso per i file di log (opzionale, può essere gestito dall'app)
# LogFile = logs/app.log

# Directory per upload temporanei (opzionale)
# UploadsDir = uploads/

[Azienda]
# Dati della tua azienda (usati per determinare se una fattura è Attiva o Passiva)
RagioneSociale = PIERLUIGI BOTTAMEDI
PartitaIVA = 02273530226
CodiceFiscale = BTTPLG77S15F187I
Indirizzo = Via Degasperi 47
CAP = 38017
Citta = MEZZOLOMBARDO
Provincia = TN
Paese = IT
Telefono = 0461 602534
RegimeFiscale = RF01
# RF01 per Ordinario, RF02 per Contribuenti minimi, RF19 per Forfettario

# Email e PEC aziendali (opzionali)
# Email = tuaemail@dominio.it
# PEC = tuapec@pec.it

[Impostazioni]
# Numero di giorni dopo cui una fattura è considerata scaduta (default è 0 se non specificato)
# GiorniScadenzaDefault = 30

# Abilita/disabilita il controllo rigoroso della P.IVA (true/false)
# ControlloPIVA = true

# Limite default per paginazione nelle UI (se il core lo usa)
# ElementiPerPagina = 50

[CloudSync]
# Impostazioni per la sincronizzazione con Google Drive
# Imposta a true per abilitare il sync
enabled = false
# Intervallo in secondi per il sync automatico (es. 3600 = 1 ora)
auto_sync_interval = 3600
# Nome del file delle credenziali OAuth
credentials_file = google_credentials.json
# Nome del file del token di accesso (generato automaticamente)
token_file = google_token.json
# Nome del file DB su Google Drive
remote_db_name = fattura_analyzer_backup.sqlite
# Lasciare vuoto, sarà popolato automaticamente dopo il primo sync
remote_file_id = 

[UI]
# Sezione per salvare stati UI, usata dalle funzioni in utils.py
# Non modificare manualmente questa sezione se non sai cosa stai facendo.
# [UI_Table_States]
# Esempio: nome_tabella_key = stato_serializzato_base64

[Debug]
# Livello di logging per il core (se il core lo supporta)
# DEBUG, INFO, WARNING, ERROR, CRITICAL
# LogLevel = INFO
