import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Download,
  FileText,
  FileSpreadsheet,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Trash,
  Archive,
  Database,
  History,
  Filter,
  Loader2,
} from 'lucide-react';

// Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Separator,
  Alert,
  AlertDescription,
} from '@/components/ui';

// Custom Components
import { TransactionImport } from '@/components/transactions/TransactionImport';

// Hooks
import {
  useImportInvoicesXML,
  useValidateInvoiceFiles,
  useExportData,
  useDownloadTransactionTemplate,
  useCreateBackup,
  useImportHistory,
  useImportStatistics,
  useImportExportHealth,
  useCleanupTempFiles,
  useExportPresets,
  ImportResult,
} from '@/hooks/useImportExport';

// Utils
import { formatDate, formatFileSize } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface ExportOptions {
  format: 'excel' | 'csv' | 'json';
  type: 'invoices' | 'transactions' | 'anagraphics' | 'reconciliation-report';
  filters?: Record<string, any>;
  includeDetails?: boolean;
}

export function ImportExportPage() {
  const [activeTab, setActiveTab] = useState('import');
  const [importType, setImportType] = useState<'invoices' | 'transactions'>('invoices');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    type: 'invoices',
    includeDetails: true,
  });

  // Hooks
  const importInvoices = useImportInvoicesXML();
  const validateInvoices = useValidateInvoiceFiles();
  const exportData = useExportData();
  const downloadTemplate = useDownloadTransactionTemplate();
  const createBackup = useCreateBackup();
  const cleanupFiles = useCleanupTempFiles();
  const exportPresets = useExportPresets();

  // Queries
  const { data: importHistory, isLoading: isLoadingHistory, refetch: refetchHistory } = useImportHistory(20);
  const { data: statistics, isLoading: isLoadingStats } = useImportStatistics();
  const { data: healthData } = useImportExportHealth();

  // Dropzone configuration for invoices
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
    setImportResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: importType === 'invoices' ? {
      'application/xml': ['.xml'],
      'application/pkcs7-mime': ['.p7m'],
    } : {
      'text/csv': ['.csv'],
    },
    multiple: importType === 'invoices',
    disabled: importInvoices.isPending || validateInvoices.isPending,
  });

  // Handle invoice import
  const handleInvoiceImport = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      const result = await importInvoices.mutateAsync(selectedFiles);
      setImportResult(result);
      setSelectedFiles([]);
      refetchHistory();
    } catch (error) {
      // Error handled by hook
    }
  }, [selectedFiles, importInvoices, refetchHistory]);

  // Handle export
  const handleExport = useCallback(() => {
    exportData.mutate(exportOptions);
  }, [exportData, exportOptions]);

  const resetImport = useCallback(() => {
    setSelectedFiles([]);
    setImportResult(null);
  }, []);

  const isImporting = importInvoices.isPending;
  const isValidating = validateInvoices.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import & Export</h1>
          <p className="text-muted-foreground">
            Gestione importazione ed esportazione dati
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* System Health Indicator */}
          {healthData && (
            <Badge 
              variant={healthData.status === 'healthy' ? 'success' : 'warning'}
              className="mr-2"
            >
              Sistema {healthData.status === 'healthy' ? 'OK' : 'Degradato'}
            </Badge>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => cleanupFiles.mutate()}
            disabled={cleanupFiles.isPending}
          >
            {cleanupFiles.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash className="mr-2 h-4 w-4" />
            )}
            Pulizia
          </Button>
          
          <Button
            variant="outline"
            onClick={() => createBackup.mutate()}
            disabled={createBackup.isPending}
          >
            {createBackup.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Archive className="mr-2 h-4 w-4" />
            )}
            Backup Completo
          </Button>
        </div>
      </div>

      {/* System Statistics */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.invoices.total_invoices}
                </div>
                <div className="text-sm text-muted-foreground">
                  Fatture Totali
                </div>
                <div className="text-xs text-green-600 mt-1">
                  +{statistics.invoices.last_30_days} ultimi 30gg
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statistics.transactions.total_transactions}
                </div>
                <div className="text-sm text-muted-foreground">
                  Transazioni Totali
                </div>
                <div className="text-xs text-green-600 mt-1">
                  +{statistics.transactions.last_30_days} ultimi 30gg
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {statistics.invoices.active_invoices}
                </div>
                <div className="text-sm text-muted-foreground">
                  Fatture Attive
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {statistics.invoices.passive_invoices}
                </div>
                <div className="text-sm text-muted-foreground">
                  Fatture Passive
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import">Importazione</TabsTrigger>
          <TabsTrigger value="export">Esportazione</TabsTrigger>
          <TabsTrigger value="history">Cronologia</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Import Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Tipo Importazione
                </CardTitle>
                <CardDescription>
                  Seleziona il tipo di dati da importare
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div 
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-colors",
                      importType === 'invoices' ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                    )}
                    onClick={() => setImportType('invoices')}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Fatture Elettroniche</h3>
                        <p className="text-sm text-muted-foreground">File XML o P7M</p>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-colors",
                      importType === 'transactions' ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                    )}
                    onClick={() => setImportType('transactions')}
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Movimenti Bancari</h3>
                        <p className="text-sm text-muted-foreground">File CSV</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {importType === 'transactions' && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate.mutate()}
                      disabled={downloadTemplate.isPending}
                    >
                      {downloadTemplate.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Scarica Template CSV
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Upload - Only for Invoices */}
            {importType === 'invoices' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    File Upload
                  </CardTitle>
                  <CardDescription>
                    Trascina file XML/P7M o clicca per selezionare
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    {...getRootProps()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                      isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
                      (isImporting || isValidating) && "pointer-events-none opacity-50"
                    )}
                  >
                    <input {...getInputProps()} />
                    {isImporting || isValidating ? (
                      <div className="space-y-2">
                        <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                        <p className="text-primary font-medium">
                          {isValidating ? 'Validazione in corso...' : 'Importazione in corso...'}
                        </p>
                      </div>
                    ) : isDragActive ? (
                      <p className="text-primary font-medium">Rilascia i file qui...</p>
                    ) : (
                      <div>
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="font-medium mb-2">
                          Clicca per selezionare file XML/P7M
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Supportati: .xml, .p7m (max 50 file)
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">File selezionati:</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                                disabled={isImporting || isValidating}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Import Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleInvoiceImport}
                      disabled={selectedFiles.length === 0 || isImporting || isValidating}
                      className="flex-1"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importazione...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Avvia Importazione
                        </>
                      )}
                    </Button>
                    
                    {selectedFiles.length > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={resetImport}
                        disabled={isImporting || isValidating}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Transaction Import Component */}
          {importType === 'transactions' && (
            <TransactionImport
              onImportComplete={(result) => {
                setImportResult({
                  processed: result.success + result.duplicates + result.errors,
                  success: result.success,
                  duplicates: result.duplicates,
                  errors: result.errors,
                  unsupported: 0,
                  files: [{ name: 'CSV Import', status: 'completed' }]
                });
                refetchHistory();
              }}
            />
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Risultati Importazione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                    <div className="text-sm text-green-600">Successi</div>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates}</div>
                    <div className="text-sm text-yellow-600">Duplicati</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                    <div className="text-sm text-red-600">Errori</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{importResult.processed}</div>
                    <div className="text-sm text-gray-600">Totale</div>
                  </div>
                </div>
                
                {importResult.files.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Dettaglio File:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {importResult.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <Badge variant={
                            file.status === 'processed' || file.status === 'completed' ? 'success' :
                            file.status.includes('error') || file.status.includes('Error') ? 'destructive' :
                            'secondary'
                          }>
                            {file.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Export Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Configurazione Export
                </CardTitle>
                <CardDescription>
                  Configura le opzioni di esportazione
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Tipo di Dati</label>
                    <Select 
                      value={exportOptions.type} 
                      onValueChange={(value: any) => setExportOptions(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invoices">Fatture</SelectItem>
                        <SelectItem value="transactions">Movimenti Bancari</SelectItem>
                        <SelectItem value="anagraphics">Anagrafiche</SelectItem>
                        <SelectItem value="reconciliation-report">Report Riconciliazione</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Formato</label>
                    <Select 
                      value={exportOptions.format} 
                      onValueChange={(value: any) => setExportOptions(prev => ({ ...prev, format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                        <SelectItem value="json">JSON (.json)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include_details"
                      checked={exportOptions.includeDetails}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, includeDetails: !!checked }))
                      }
                    />
                    <label htmlFor="include_details" className="text-sm">
                      Includi dettagli aggiuntivi
                    </label>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-medium">Filtri (Opzionali)</h4>
                  
                  {exportOptions.type === 'invoices' && (
                    <div className="grid gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Tipo Fattura</label>
                        <Select onValueChange={(value) => 
                          setExportOptions(prev => ({ 
                            ...prev, 
                            filters: { ...prev.filters, invoice_type: value === 'all' ? undefined : value }
                          }))
                        }>
                          <SelectTrigger>
                            <SelectValue placeholder="Tutti i tipi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tutti i tipi</SelectItem>
                            <SelectItem value="Attiva">Fatture Attive</SelectItem>
                            <SelectItem value="Passiva">Fatture Passive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm text-muted-foreground">Data Inizio</label>
                          <Input
                            type="date"
                            onChange={(e) => 
                              setExportOptions(prev => ({ 
                                ...prev, 
                                filters: { ...prev.filters, start_date: e.target.value }
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Data Fine</label>
                          <Input
                            type="date"
                            onChange={(e) => 
                              setExportOptions(prev => ({ 
                                ...prev, 
                                filters: { ...prev.filters, end_date: e.target.value }
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {exportOptions.type === 'transactions' && (
                    <div className="grid gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Stato Riconciliazione</label>
                        <Select onValueChange={(value) => 
                          setExportOptions(prev => ({ 
                            ...prev, 
                            filters: { ...prev.filters, status_filter: value === 'all' ? undefined : value }
                          }))
                        }>
                          <SelectTrigger>
                            <SelectValue placeholder="Tutti gli stati" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tutti gli stati</SelectItem>
                            <SelectItem value="Da Riconciliare">Da Riconciliare</SelectItem>
                            <SelectItem value="Riconciliato Tot.">Riconciliate</SelectItem>
                            <SelectItem value="Ignorato">Ignorate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  
                  {exportOptions.type === 'anagraphics' && (
                    <div>
                      <label className="text-sm text-muted-foreground">Tipo Anagrafica</label>
                      <Select onValueChange={(value) => 
                        setExportOptions(prev => ({ 
                          ...prev, 
                          filters: { ...prev.filters, type_filter: value === 'all' ? undefined : value }
                        }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Tutti i tipi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i tipi</SelectItem>
                          <SelectItem value="Cliente">Clienti</SelectItem>
                          <SelectItem value="Fornitore">Fornitori</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Export Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Azioni Rapide
                </CardTitle>
                <CardDescription>
                  Export predefiniti e azioni comuni
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleExport}
                  disabled={exportData.isPending}
                  className="w-full"
                >
                  {exportData.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Esportazione...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Esporta Dati Selezionati
                    </>
                  )}
                </Button>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Export Predefiniti:</h4>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={exportPresets.presets.activeInvoicesExcel}
                    disabled={exportPresets.isExporting}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Fatture Attive (Excel)
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={exportPresets.presets.unreconciledTransactionsCSV}
                    disabled={exportPresets.isExporting}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Transazioni da Riconciliare (CSV)
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={exportPresets.presets.fullReconciliationReport}
                    disabled={exportPresets.isExporting}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Report Riconciliazione Completo
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={exportPresets.presets.clientsWithStats}
                    disabled={exportPresets.isExporting}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Clienti con Statistiche
                  </Button>
                </div>
                
                <Separator />
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => createBackup.mutate()}
                  disabled={createBackup.isPending}
                >
                  {createBackup.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="mr-2 h-4 w-4" />
                  )}
                  Backup Completo Sistema
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Export Status */}
          {(exportData.isPending || exportPresets.isExporting) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Preparazione Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Download className="h-4 w-4" />
                  <AlertDescription>
                    Preparazione del file di export in corso. Il download inizierà automaticamente.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Cronologia Import
              </CardTitle>
              <CardDescription>
                Storico delle operazioni di importazione
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : importHistory && importHistory.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data & Ora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Successi</TableHead>
                        <TableHead>Errori</TableHead>
                        <TableHead>Stato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item.timestamp)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.type}</Badge>
                          </TableCell>
                          <TableCell>{item.files_processed}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {item.files_success}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {item.files_errors}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              item.status === 'completed' ? 'success' :
                              item.status === 'failed' ? 'destructive' :
                              'secondary'
                            }>
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Nessuna cronologia</h3>
                  <p className="text-muted-foreground">
                    Non sono ancora state effettuate operazioni di importazione.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
