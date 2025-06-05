import React, { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';

interface SetupStep {
  step: number;
  name: string;
  title: string;
  description: string;
  completed: boolean;
}

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<any>(null);
  const [companyData, setCompanyData] = useState({
    ragione_sociale: '',
    partita_iva: '',
    codice_fiscale: '',
    indirizzo: '',
    cap: '',
    citta: '',
    provincia: '',
    telefono: '',
    email: ''
  });

  const steps: SetupStep[] = [
    { step: 1, name: 'welcome', title: 'Benvenuto', description: 'Introduzione al sistema', completed: false },
    { step: 2, name: 'company', title: 'Dati Azienda', description: 'Configura i tuoi dati aziendali', completed: false },
    { step: 3, name: 'database', title: 'Database', description: 'Inizializzazione database', completed: false },
    { step: 4, name: 'complete', title: 'Completamento', description: 'Finalizzazione setup', completed: false }
  ];

  useEffect(() => {
    loadWizardState();
  }, []);

  const loadWizardState = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/first-run/wizard/start');
      const data = await response.json();
      
      if (data.success) {
        setWizardData(data.data);
        setCurrentStep(data.data.current_step || 1);
      }
    } catch (error) {
      console.error('Error loading wizard state:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      setError(null);
      setSuccess(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
      setSuccess(null);
    }
  };

  const handleCompanySubmit = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Validazione base
      if (!companyData.ragione_sociale || !companyData.partita_iva) {
        throw new Error('Ragione sociale e Partita IVA sono obbligatori');
      }

      if (companyData.partita_iva.length !== 11) {
        throw new Error('Partita IVA deve essere di 11 cifre');
      }

      // Salva dati aziendali
      const response = await fetch('http://127.0.0.1:8000/api/setup/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Dati aziendali salvati con successo!');
        setTimeout(() => {
          handleNext();
        }, 1500);
      } else {
        throw new Error(data.message || 'Errore salvataggio dati aziendali');
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore salvataggio dati');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDatabaseSetup = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      setSuccess('Inizializzazione database in corso...');
      
      const response = await fetch('http://127.0.0.1:8000/api/first-run/wizard/database-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Database inizializzato con successo!');
        setTimeout(() => {
          handleNext();
        }, 2000);
      } else {
        throw new Error(data.message || 'Errore inizializzazione database');
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore setup database');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteSetup = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      setSuccess('Completamento setup in corso...');
      
      const response = await fetch('http://127.0.0.1:8000/api/first-run/wizard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('🎉 Setup completato con successo!');
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        throw new Error(data.message || 'Errore completamento setup');
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore completamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipWizard = async () => {
    if (confirm('Vuoi saltare la configurazione? Verranno usati dati di default.')) {
      setIsProcessing(true);
      
      try {
        const response = await fetch('http://127.0.0.1:8000/api/first-run/wizard/skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setSuccess('Configurazione saltata - ricorda di aggiornare i dati aziendali!');
          setTimeout(() => {
            onComplete();
          }, 2000);
        } else {
          throw new Error('Errore durante salto configurazione');
        }
        
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Errore');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6">
          <h1 className="text-2xl font-bold">🧾 FatturaAnalyzer v2 Setup</h1>
          <p className="opacity-90">Sistema professionale per gestione fatture italiane</p>
        </div>

        {/* Progress Bar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Passo {currentStep} di {steps.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
          
          {/* Steps indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step) => (
              <div 
                key={step.step} 
                className={`flex items-center space-x-2 ${
                  step.step <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step.step < currentStep ? 'bg-primary border-primary text-white' :
                  step.step === currentStep ? 'border-primary text-primary' :
                  'border-gray-300 text-gray-400'
                }`}>
                  {step.step < currentStep ? '✓' : step.step}
                </div>
                <span className="text-sm font-medium hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="text-red-400">⚠️</div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Errore</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="text-green-400">✅</div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Successo</h3>
                  <p className="text-sm text-green-700 mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-xl font-semibold mb-2">Benvenuto in FatturaAnalyzer v2!</h2>
                <p className="text-muted-foreground">
                  Il sistema professionale per la gestione delle fatture elettroniche italiane.
                  Questo wizard ti guiderà nella configurazione iniziale.
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2">✨ Caratteristiche principali:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Gestione fatture attive e passive</li>
                  <li>• Riconciliazione automatica con estratti conto</li>
                  <li>• Analytics e reportistica avanzata</li>
                  <li>• Sincronizzazione cloud con Google Drive</li>
                  <li>• Import/Export in vari formati</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleSkipWizard}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Salta configurazione
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Inizia Setup →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Company Data */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">📝 Dati Aziendali</h2>
                <p className="text-muted-foreground">
                  Inserisci i dati della tua azienda per configurare correttamente il sistema.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Ragione Sociale <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyData.ragione_sociale}
                    onChange={(e) => setCompanyData({...companyData, ragione_sociale: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Es. La Tua Azienda SRL"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Partita IVA <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyData.partita_iva}
                    onChange={(e) => setCompanyData({...companyData, partita_iva: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="12345678901"
                    maxLength={11}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Codice Fiscale</label>
                  <input
                    type="text"
                    value={companyData.codice_fiscale}
                    onChange={(e) => setCompanyData({...companyData, codice_fiscale: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="RSSMRA80A01H501U"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Indirizzo</label>
                  <input
                    type="text"
                    value={companyData.indirizzo}
                    onChange={(e) => setCompanyData({...companyData, indirizzo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Via Roma 123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">CAP</label>
                  <input
                    type="text"
                    value={companyData.cap}
                    onChange={(e) => setCompanyData({...companyData, cap: e.target.value.replace(/\D/g, '').slice(0, 5)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="00100"
                    maxLength={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Città</label>
                  <input
                    type="text"
                    value={companyData.citta}
                    onChange={(e) => setCompanyData({...companyData, citta: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Roma"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Provincia</label>
                  <input
                    type="text"
                    value={companyData.provincia}
                    onChange={(e) => setCompanyData({...companyData, provincia: e.target.value.toUpperCase().slice(0, 2)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="RM"
                    maxLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Telefono</label>
                  <input
                    type="text"
                    value={companyData.telefono}
                    onChange={(e) => setCompanyData({...companyData, telefono: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+39 06 1234567"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData({...companyData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="info@azienda.it"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground"
                >
                  ← Indietro
                </button>
                <button
                  onClick={handleCompanySubmit}
                  disabled={isProcessing || !companyData.ragione_sociale || !companyData.partita_iva}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvataggio...
                    </span>
                  ) : (
                    'Salva e Continua →'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Database Setup */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🗄️</div>
                <h2 className="text-xl font-semibold mb-2">Inizializzazione Database</h2>
                <p className="text-muted-foreground">
                  Ora creeremo il database e le tabelle necessarie per il funzionamento del sistema.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2">🔧 Operazioni da eseguire:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Creazione file database SQLite</li>
                  <li>• Inizializzazione tabelle (fatture, anagrafiche, transazioni)</li>
                  <li>• Configurazione indici per performance</li>
                  <li>• Test connettività database</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleBack}
                  disabled={isProcessing}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground"
                >
                  ← Indietro
                </button>
                <button
                  onClick={handleDatabaseSetup}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Inizializzazione...
                    </span>
                  ) : (
                    'Inizializza Database →'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-xl font-semibold mb-2">Setup Quasi Completato!</h2>
                <p className="text-muted-foreground">
                  Perfetto! Il sistema è configurato e pronto all'uso. 
                  Clicca su "Completa Setup" per finalizzare l'installazione.
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2">✅ Configurazione completata:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Dati aziendali configurati</li>
                  <li>• Database inizializzato correttamente</li>
                  <li>• Sistema pronto per l'uso</li>
                  <li>• Interfaccia desktop attiva</li>
                </ul>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2">🚀 Prossimi passi:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Importa le tue fatture esistenti</li>
                  <li>• Configura sincronizzazione cloud (opzionale)</li>
                  <li>• Esplora il dashboard e le funzionalità</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handleBack}
                  disabled={isProcessing}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground"
                >
                  ← Indietro
                </button>
                <button
                  onClick={handleCompleteSetup}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Finalizzazione...
                    </span>
                  ) : (
                    '🎯 Completa Setup'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 text-center text-sm text-muted-foreground">
          FatturaAnalyzer v2.0 - Sistema professionale per gestione fatture italiane
        </div>
      </div>
    </div>
  );
};
