import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Building,
  Cloud,
  Database,
  Bell,
  Shield,
  Cpu,
  HardDrive,
  Activity,
  Zap,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  RotateCcw,
  Eye,
  Copy,
} from 'lucide-react';

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Separator,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Slider,
} from '@/components/ui';

// Hooks
import { 
  useSyncStatus, 
  useEnableSync, 
  useDisableSync, 
  useManualSync, 
  useTestGoogleDriveConnection,
  useCreateBackup
} from '@/hooks/useSync';

// Services
import { apiClient } from '@/services/api';

// Utils
import { formatFileSize } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface CompanySettings {
  ragione_sociale: string;
  partita_iva: string;
  codice_fiscale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  paese: string;
  telefono: string;
  email: string;
  pec?: string;
  codice_destinatario?: string;
  regime_fiscale: string;
  iban?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  invoice_reminders: boolean;
  payment_alerts: boolean;
  system_notifications: boolean;
  daily_reports: boolean;
  weekly_reports: boolean;
}

interface SystemSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  date_format: string;
  auto_backup: boolean;
  backup_retention_days: number;
  debug_mode: boolean;
}

interface SystemHealth {
  database_size: number;
  total_invoices: number;
  total_transactions: number;
  total_anagraphics: number;
  last_backup: string | null;
  system_version: string;
  uptime: string;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const queryClient = useQueryClient();

  // State per le impostazioni
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    ragione_sociale: '',
    partita_iva: '',
    codice_fiscale: '',
    indirizzo: '',
    cap: '',
    citta: '',
    provincia: '',
    paese: 'IT',
    telefono: '',
    email: '',
    regime_fiscale: 'RF01',
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email_notifications: true,
    invoice_reminders: true,
    payment_alerts: true,
    system_notifications: false,
    daily_reports: false,
    weekly_reports: true,
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    theme: 'system',
    language: 'it',
    timezone: 'Europe/Rome',
    date_format: 'DD/MM/YYYY',
    auto_backup: true,
    backup_retention_days: 30,
    debug_mode: false,
  });

  // Queries
  const { data: currentSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await apiClient.getSetupStatus();
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Errore nel caricamento impostazioni');
    },
  });

  const { data: syncStatus } = useSyncStatus();

  const { data: systemHealth, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await apiClient.getSystemInfo();
      if (response.success) {
        return response.data.system_info as SystemHealth;
      }
      return null;
    },
  });

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiClient.completeSetup(settings);
      if (!response.success) {
        throw new Error(response.message || 'Errore nel salvataggio');
      }
      return response;
    },
    onSuccess: () => {
      setUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const enableSync = useEnableSync();
  const disableSync = useDisableSync();
  const manualSync = useManualSync();
  const testConnection = useTestGoogleDriveConnection();
  const createBackup = useCreateBackup();

  // Effects
  useEffect(() => {
    if (currentSettings?.company_data) {
      setCompanySettings(currentSettings.company_data);
    }
  }, [currentSettings]);

  useEffect(() => {
    setUnsavedChanges(true);
  }, [companySettings, notificationSettings, systemSettings]);

  // Handlers
  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({
      company_data: companySettings,
      notification_settings: notificationSettings,
      system_settings: systemSettings,
    });
  };

  const handleResetSettings = () => {
    if (currentSettings?.company_data) {
      setCompanySettings(currentSettings.company_data);
    }
    setUnsavedChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
          <p className="text-muted-foreground">
            Configurazione sistema e preferenze
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {unsavedChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              Modifiche non salvate
            </Badge>
          )}
          
          <Button
            variant="outline"
            onClick={handleResetSettings}
            disabled={!unsavedChanges}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Ripristina
          </Button>
          
          <Button
            onClick={handleSaveSettings}
            disabled={!unsavedChanges || saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salva Impostazioni
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company">Azienda</TabsTrigger>
          <TabsTrigger value="sync">Cloud Sync</TabsTrigger>
          <TabsTrigger value="notifications">Notifiche</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="advanced">Avanzate</TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Dati Aziendali
              </CardTitle>
              <CardDescription>
                Informazioni della tua azienda per fatturazione e documenti
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ragione_sociale">Ragione Sociale *</Label>
                  <Input
                    id="ragione_sociale"
                    value={companySettings.ragione_sociale}
                    onChange={(e) => setCompanySettings(prev => ({ 
                      ...prev, 
                      ragione_sociale: e.target.value 
                    }))}
                    placeholder="Nome della tua azienda"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="partita_iva">Partita IVA *</Label>
                  <Input
                    id="partita_iva"
                    value={companySettings.partita_iva}
                    onChange={(e) => setCompanySettings(prev => ({ 
                      ...prev, 
                      partita_iva: e.target.value 
                    }))}
                    placeholder="IT12345678901"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
                  <Input
                    id="codice_fiscale"
                    value={companySettings.codice_fiscale}
                    onChange={(e) => setCompanySettings(prev => ({ 
                      ...prev, 
                      codice_fiscale: e.target.value 
                    }))}
                    placeholder="Stesso della P.IVA se non diverso"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="regime_fiscale">Regime Fiscale</Label>
                  <Select 
                    value={companySettings.regime_fiscale}
                    onValueChange={(value) => setCompanySettings(prev => ({ 
                      ...prev, 
                      regime_fiscale: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RF01">Regime Ordinario</SelectItem>
                      <SelectItem value="RF02">Regime dei Contribuenti Minimi</SelectItem>
                      <SelectItem value="RF04">Regime Agricolo</SelectItem>
                      <SelectItem value="RF05">Regime Forfettario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Indirizzo</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="indirizzo">Via/Piazza</Label>
                    <Input
                      id="indirizzo"
                      value={companySettings.indirizzo}
                      onChange={(e) => setCompanySettings(prev => ({ 
                        ...prev, 
                        indirizzo: e.target.value 
                      }))}
                      placeholder="Via Roma, 123"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cap">CAP</Label>
                    <Input
                      id="cap"
                      value={companySettings.cap}
                      onChange={(e) => setCompanySettings(prev => ({ 
                        ...prev, 
                        cap: e.target.value 
                      }))}
                      placeholder="00100"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="citta">Città</Label>
                    <Input
                      id="citta"
                      value={companySettings.citta}
                      onChange={(e) => setCompanySettings(prev => ({ 
                        ...prev, 
                        citta: e.target.value 
                      }))}
                      placeholder="Roma"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="provincia">Provincia</Label>
                    <Input
                      id="provincia"
                      value={companySettings.provincia}
                      onChange={(e) => setCompanySettings(prev => ({ 
                        ...prev, 
                        provincia: e.target.value 
                      }))}
                      placeholder="RM"
                      maxLength={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paese">Paese</Label>
                    <Select 
                      value={companySettings.paese}
                      onValueChange={(value) => setCompanySettings(prev => ({ 
                        ...prev, 
                        paese: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IT">Italia</SelectItem>
                        <SelectItem value="CH">Svizzera</SelectItem>
                        <SelectItem value="SM">San Marino</SelectItem>
                        <SelectItem value="VA">Vaticano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Contatti</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={companySettings.email}
                      onChange={(e) => setCompanySettings(prev => ({ 
                        ...prev, 
                        email: e.target.value 
                      }))}
                      placeholder="info@azienda.it"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pec">PEC</Label>
                    <Input
                      id="pec"
                      type="email"
                      value={companySettings.pec || ''}
                      onChange={(e) => setCompanySettings(prev => ({ 
                        ...prev, 
                        pec: e.target.value 
                      }))}
                      placeholder="pec@azienda.it"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Telefono</Label>
                    <Input
                      id="telefono"
                      value={companySettings.telefono}
                      onChange={(e) => setCompanySettings(prev => ({ 
                        ...prev, 
                        telefono: e.target.value 
                      }))}
                      placeholder="+39 06 12345678"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="codice_destinatario">Codice Destinatario</Label>
                    <Input
                      id="codice_destinatario"
                      value={companySettings.codice_destinatario || ''}
                      onChange={(e) => setCompanySettings(prev => ({ 
                        ...prev, 
                        codice_destinatario: e.target.value 
                      }))}
                      placeholder="Per fatturazione elettronica"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Dati Bancari</h4>
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={companySettings.iban || ''}
                    onChange={(e) => setCompanySettings(prev => ({ 
                      ...prev, 
                      iban: e.target.value 
                    }))}
                    placeholder="IT60 X054 2811 1010 0000 0123 456"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cloud Sync Settings */}
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Sincronizzazione Cloud
              </CardTitle>
              <CardDescription>
                Configurazione backup e sincronizzazione con Google Drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sync Status */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    syncStatus?.enabled ? "bg-green-500" : "bg-gray-400"
                  )} />
                  <div>
                    <p className="font-medium">
                      {syncStatus?.enabled ? 'Sincronizzazione Attiva' : 'Sincronizzazione Disattivata'}
                    </p>
                    {syncStatus?.last_sync_time && (
                      <p className="text-sm text-muted-foreground">
                        Ultimo sync: {new Date(syncStatus.last_sync_time).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {syncStatus?.enabled ? (
                    <Button
                      variant="outline"
                      onClick={() => disableSync.mutate()}
                      disabled={disableSync.isPending}
                    >
                      Disabilita
                    </Button>
                  ) : (
                    <Button
                      onClick={() => enableSync.mutate()}
                      disabled={enableSync.isPending}
                    >
                      Abilita Sync
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Sync Actions */}
              {syncStatus?.enabled && (
                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    variant="outline"
                    onClick={() => manualSync.mutate({})}
                    disabled={manualSync.isPending}
                  >
                    {manualSync.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Cloud className="mr-2 h-4 w-4" />
                    )}
                    Sincronizza Ora
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => testConnection.mutate()}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="mr-2 h-4 w-4" />
                    )}
                    Test Connessione
                  </Button>
                </div>
              )}
              
              {/* Setup Instructions */}
              {!syncStatus?.enabled && (
                <Alert>
                  <Cloud className="h-4 w-4" />
                  <AlertDescription>
                    Per abilitare la sincronizzazione cloud, è necessario configurare le credenziali Google Drive.
                    Consulta la documentazione per le istruzioni complete.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifiche
              </CardTitle>
              <CardDescription>
                Configura quando e come ricevere notifiche dal sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email_notifications">Notifiche Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Ricevi notifiche via email per eventi importanti
                    </p>
                  </div>
                  <Switch
                    id="email_notifications"
                    checked={notificationSettings.email_notifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({
                      ...prev,
                      email_notifications: checked
                    }))}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Promemoria Fatture</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="invoice_reminders">Promemoria Scadenze</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifiche per fatture in scadenza
                      </p>
                    </div>
                    <Switch
                      id="invoice_reminders"
                      checked={notificationSettings.invoice_reminders}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({
                        ...prev,
                        invoice_reminders: checked
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="payment_alerts">Avvisi Pagamenti</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifiche per pagamenti ricevuti o in ritardo
                      </p>
                    </div>
                    <Switch
                      id="payment_alerts"
                      checked={notificationSettings.payment_alerts}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({
                        ...prev,
                        payment_alerts: checked
                      }))}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Report Automatici</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="daily_reports">Report Giornalieri</Label>
                      <p className="text-sm text-muted-foreground">
                        Riepilogo giornaliero delle attività
                      </p>
                    </div>
                    <Switch
                      id="daily_reports"
                      checked={notificationSettings.daily_reports}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({
                        ...prev,
                        daily_reports: checked
                      }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly_reports">Report Settimanali</Label>
                      <p className="text-sm text-muted-foreground">
                        Analisi settimanale dei KPI principali
                      </p>
                    </div>
                    <Switch
                      id="weekly_reports"
                      checked={notificationSettings.weekly_reports}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({
                        ...prev,
                        weekly_reports: checked
                      }))}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="system_notifications">Notifiche Sistema</Label>
                    <p className="text-sm text-muted-foreground">
                      Avvisi per aggiornamenti e manutenzione del sistema
                    </p>
                  </div>
                  <Switch
                    id="system_notifications"
                    checked={notificationSettings.system_notifications}
                    onCheckedChange={(checked) => setNotificationSettings(prev => ({
                      ...prev,
                      system_notifications: checked
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Impostazioni Sistema
              </CardTitle>
              <CardDescription>
                Configurazione interfaccia e comportamento del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Interfaccia</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="theme">Tema</Label>
                    <Select 
                      value={systemSettings.theme}
                      onValueChange={(value: any) => setSystemSettings(prev => ({ 
                        ...prev, 
                        theme: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Chiaro</SelectItem>
                        <SelectItem value="dark">Scuro</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language">Lingua</Label>
                    <Select 
                      value={systemSettings.language}
                      onValueChange={(value) => setSystemSettings(prev => ({ 
                        ...prev, 
                        language: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="it">Italiano</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Formati</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_format">Formato Data</Label>
                    <Select 
                      value={systemSettings.date_format}
                      onValueChange={(value) => setSystemSettings(prev => ({ 
                        ...prev, 
                        date_format: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Orario</Label>
                    <Select 
                      value={systemSettings.timezone}
                      onValueChange={(value) => setSystemSettings(prev => ({ 
                        ...prev, 
                        timezone: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Rome">Europa/Roma</SelectItem>
                        <SelectItem value="Europe/London">Europa/Londra</SelectItem>
                        <SelectItem value="Europe/Berlin">Europa/Berlino</SelectItem>
                        <SelectItem value="America/New_York">America/New York</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Backup</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto_backup">Backup Automatico</Label>
                    <p className="text-sm text-muted-foreground">
                      Crea backup automatici del database
                    </p>
                  </div>
                  <Switch
                    id="auto_backup"
                    checked={systemSettings.auto_backup}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      auto_backup: checked
                    }))}
                  />
                </div>
                
                {systemSettings.auto_backup && (
                  <div className="space-y-2">
                    <Label>Giorni di Conservazione Backup</Label>
                    <Slider
                      value={[systemSettings.backup_retention_days]}
                      onValueChange={(value) => setSystemSettings(prev => ({
                        ...prev,
                        backup_retention_days: value[0]
                      }))}
                      max={365}
                      min={7}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>7 giorni</span>
                      <span>{systemSettings.backup_retention_days} giorni</span>
                      <span>1 anno</span>
                    </div>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => createBackup.mutate()}
                  disabled={createBackup.isPending}
                >
                  {createBackup.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Crea Backup Manuale
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Stato Sistema
              </CardTitle>
              <CardDescription>
                Informazioni sullo stato e prestazioni del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHealth ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : systemHealth ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Versione Sistema</span>
                      <span className="text-sm font-medium">{systemHealth.system_version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Dimensione Database</span>
                      <span className="text-sm font-medium">
                        {formatFileSize(systemHealth.database_size)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Fatture Totali</span>
                      <span className="text-sm font-medium">{systemHealth.total_invoices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Transazioni Totali</span>
                      <span className="text-sm font-medium">{systemHealth.total_transactions}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Anagrafiche Totali</span>
                      <span className="text-sm font-medium">{systemHealth.total_anagraphics}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Uptime</span>
                      <span className="text-sm font-medium">{systemHealth.uptime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Ultimo Backup</span>
                      <span className="text-sm font-medium">
                        {systemHealth.last_backup ? 
                          new Date(systemHealth.last_backup).toLocaleDateString() : 
                          'Mai'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Stato</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">Operativo</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Impossibile caricare le informazioni di sistema
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Impostazioni Avanzate
              </CardTitle>
              <CardDescription>
                Configurazioni avanzate per utenti esperti
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Attenzione: Modificare queste impostazioni può influenzare il funzionamento del sistema.
                  Procedere solo se si è sicuri di quello che si sta facendo.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="debug_mode">Modalità Debug</Label>
                    <p className="text-sm text-muted-foreground">
                      Abilita logging dettagliato per il troubleshooting
                    </p>
                  </div>
                  <Switch
                    id="debug_mode"
                    checked={systemSettings.debug_mode}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({
                      ...prev,
                      debug_mode: checked
                    }))}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Gestione Database</h4>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Database className="mr-2 h-4 w-4" />
                          Ottimizza Database
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ottimizzazione Database</DialogTitle>
                          <DialogDescription>
                            Questa operazione riorganizzerà il database per migliorare le prestazioni.
                            Il processo potrebbe richiedere alcuni minuti.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline">Annulla</Button>
                          <Button>Avvia Ottimizzazione</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <HardDrive className="mr-2 h-4 w-4" />
                          Pulizia Cache
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Pulizia Cache</DialogTitle>
                          <DialogDescription>
                            Questa operazione eliminerà tutti i file temporanei e la cache del sistema.
                            Le prestazioni potrebbero essere temporaneamente ridotte dopo la pulizia.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline">Annulla</Button>
                          <Button>Pulisci Cache</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Importazione/Esportazione</h4>
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <Button variant="outline" className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Ripristina da Backup
                    </Button>
                    
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Esporta Configurazione
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Reset Sistema</h4>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Reset Completo Sistema
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>⚠️ Reset Completo Sistema</DialogTitle>
                        <DialogDescription>
                          <strong>ATTENZIONE:</strong> Questa operazione cancellerà TUTTI i dati del sistema
                          in modo permanente, inclusi:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Tutte le fatture e documenti</li>
                            <li>Tutti i movimenti bancari</li>
                            <li>Tutte le anagrafiche</li>
                            <li>Tutte le riconciliazioni</li>
                            <li>Tutte le configurazioni</li>
                          </ul>
                          <br />
                          <strong>Questa azione NON PUÒ essere annullata!</strong>
                          <br />
                          Assicurati di aver creato un backup prima di procedere.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Digitare "RESET COMPLETO" per confermare l'operazione
                          </AlertDescription>
                        </Alert>
                        <Input placeholder="Digitare qui..." />
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline">Annulla</Button>
                          <Button variant="destructive" disabled>
                            Reset Sistema
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Informazioni Tecniche</h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Versione API</Label>
                      <Input value="v4.0.0" readOnly />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Versione Database</Label>
                      <Input value="1.5.2" readOnly />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Ambiente</Label>
                      <Input value="Production" readOnly />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>ID Installazione</Label>
                      <div className="flex">
                        <Input value="FA-2024-ABC123" readOnly className="flex-1" />
                        <Button variant="outline" size="sm" className="ml-2">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Logs Viewer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visualizzatore Log
              </CardTitle>
              <CardDescription>
                Visualizza i log di sistema per il debugging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Select defaultValue="error">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Scarica Log
                </Button>
              </div>
              
<div className="bg-black text-green-400 font-mono text-xs p-4 rounded-lg h-64 overflow-y-auto">
                <div className="space-y-1">
                  <div>[2024-06-15 10:30:15] INFO: Sistema FatturaAnalyzer V4.0 avviato correttamente</div>
                  <div>[2024-06-15 10:30:16] INFO: Database connesso - PostgreSQL 14.2</div>
                  <div>[2024-06-15 10:30:17] INFO: Analytics V3.0 Ultra-Optimized engine inizializzato</div>
                  <div>[2024-06-15 10:30:18] INFO: Smart Reconciliation V4.0 con AI/ML abilitato</div>
                  <div>[2024-06-15 10:30:19] INFO: Enhanced Transactions V4.0 sistema pronto</div>
                  <div>[2024-06-15 10:30:20] INFO: API server in ascolto sulla porta 8000</div>
                  <div>[2024-06-15 10:31:22] INFO: Importazione fattura completata: invoice_123.xml</div>
                  <div>[2024-06-15 10:32:15] WARNING: Tentativo di connessione cloud sync fallito, retry in 30s</div>
                  <div>[2024-06-15 10:32:45] INFO: Cloud sync Google Drive connesso correttamente</div>
                  <div>[2024-06-15 10:35:10] INFO: AI Smart Reconciliation: 3 match trovati con confidenza &gt;90%</div>
                  <div>[2024-06-15 10:37:22] INFO: Backup automatico completato - 25.4MB</div>
                  <div>[2024-06-15 10:38:01] INFO: Analytics V3.0 cache refreshed con AI insights</div>
                  <div>[2024-06-15 10:39:45] INFO: Smart reconciliation learning model updated</div>
                  <div>[2024-06-15 10:40:12] INFO: Enhanced transactions pattern analysis completata</div>
                  <div>[2024-06-15 10:41:33] INFO: Client reliability scores aggiornati per 156 anagrafiche</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
