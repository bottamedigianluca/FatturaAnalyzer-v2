import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  Eye,
  Archive,
  Database,
  History,
  Settings,
  Filter,
  Search,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Textarea,
  Separator,
  Alert,
  AlertDescription,
} from '@/components/ui';

// Services
import { apiClient } from '@/services/api';

// Utils
import { formatDate, formatFileSize } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
interface ImportResult {
  processed: number;
  success: number;
  duplicates: number;
  errors: number;
  unsupported: number;
  files: FileProcessingResult[];
}

interface FileProcessingResult {
  name: string;
  status: string;
  message?: string;
}

interface ImportHistory {
  id: number;
  timestamp: string;
  type: string;
  files_processed: number;
  files_success: number;
  files_duplicates: number;
  files_errors: number;
  status: string;
}

interface ExportOptions {
  format: 'excel' | 'csv' | 'json';
  type: 'invoices' | 'transactions' | 'anagraphics' | 'reconciliation-report';
  filters?: Record<string, any>;
  include_details?: boolean;
}

export function ImportExportPage() {
  const [activeTab, setActiveTab] = useState('import');
  const [importType, setImportType] = useState<'invoices' | 'transactions'>('invoices');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    type: 'invoices',
    include_details: true,
  });

  // Fetch import history
  const { data: importHistory, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['import-history'],
    queryFn: async () => {
      const response = await apiClient.get('/import-export/status/import-history?limit=20');
      if (response.success) {
        return response.data.import_history as ImportHistory[];
      }
      return [];
    },
  });

  // Import mutations
  const importInvoicesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await apiClient.post('/import-export/invoices/xml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Errore durante l\'importazione');
      }
      
      return response.data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setIsImporting(false);
      setImportProgress(100);
      refetchHistory();
    },
    onError: () => {
      setIsImporting(false);
      setImportProgress(0);
    },
  });

  const importTransactionsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/import-export/transactions/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Errore durante l\'importazione');
      }
      
      return response.data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setIsImporting(false);
      setImportProgress(100);
      refetchHistory();
    },
    onError: () => {
      setIsImporting(false);
      setImportProgress(0);
    },
  });

  // Export mutations
  const exportMutation = useMutation({
    mutationFn: async (options: ExportOptions) => {
      let endpoint = '';
      const params = new URLSearchParams();
      
      switch (options.type) {
        case 'invoices':
          endpoint = '/import-export/export/invoices';
          break;
        case 'transactions':
          endpoint = '/import-export/export/transactions';
          break;
        case 'anagraphics':
          endpoint = '/import-export/export/anagraphics';
          break;
        case 'reconciliation-report':
          endpoint = '/import-export/export/reconciliation-report';
          break;
      }
      
      params.append('format', options.format);
      if (options.include_details) params.append('include_details', 'true');
      
      // Add filters if present
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
      }
      
      const response = await apiClient.get(`${endpoint}?${params.toString()}`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = options.format === 'excel' ? 'xlsx' : options.format;
      link.download = `${options.type}_export_${timestamp}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
  });

  // Download template mutation
  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get('/import-export/templates/transactions-csv', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_transazioni_bancarie.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/import-export/backup/create', {}, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `fattura_analyzer_backup_${timestamp}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
  });

  // Dropzone configuration
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
  });

  const handleImport = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + 10, 90));
    }, 500);
    
    try {
      if (importType === 'invoices') {
        await importInvoicesMutation.mutateAsync(selectedFiles);
      } else {
        await importTransactionsMutation.mutateAsync(selectedFiles[0]);
      }
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleExport = () => {
    exportMutation.mutate(exportOptions);
  };

  const resetImport = () => {
    setSelectedFiles([]);
    setImportResult(null);
    setImportProgress(0);
    setIsImporting(false);
  };

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
          <Button
            variant="outline"
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
          >
            {createBackupMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Archive className="mr-2 h-4 w-4" />
            )}
            Backup Completo
          </Button>
        </div>
      </div>

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
                      onClick={() => downloadTemplateMutation.mutate()}
                      disabled={downloadTemplateMutation.isPending}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Scarica Template CSV
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  File Upload
                </CardTitle>
                <CardDescription>
                  {importType === 'invoices' 
                    ? 'Trascina file XML/P7M o clicca per selezionare'
                    : 'Trascina file CSV o clicca per selezionare'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-primary font-medium">Rilascia i file qui...</p>
                  ) : (
                    <div>
                      <p className="font-medium mb-2">
                        Clicca per selezionare {importType === 'invoices' ? 'file' : 'file'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {importType === 'invoices' 
                          ? 'Supportati: .xml, .p7m (max 50 file)'
                          : 'Supportati: .csv (un file alla volta)'
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">File selezionati:</h4>
                    <div className="space-y-1">
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
                    onClick={handleImport}
                    disabled={selectedFiles.length === 0 || isImporting}
                    className="flex-1"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
                    <Button variant="outline" onClick={resetImport}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Import Progress */}
          {(isImporting || importProgress > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Progresso Importazione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Elaborazione in corso...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
                
                {isImporting && (
                  <p className="text-sm text-muted-foreground">
                    Processando {selectedFiles.length} file...
                  </p>
                )}
              </CardContent>
            </Card>
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
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                    <div className="text-sm text-green-600">Successi</div>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{importResult.duplicates}</div>
                    <div className="text-sm text-yellow-600">Duplicati</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                    <div className="text-sm text-red-600">Errori</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{importResult.processed}</div>
                    <div className="text-sm text-gray-600">Totale</div>
                  </div>
                </div>
                
                {importResult.files.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Dettaglio File:</h4>
                    <div className="space-y-2">
                      {importResult.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <Badge variant={
                            file.status === 'processed' ? 'success' :
                            file.status.includes('error') ? 'destructive' :
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
                      checked={exportOptions.include_details}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, include_details: !!checked }))
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
                  disabled={exportMutation.isPending}
                  className="w-full"
                >
                  {exportMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
                    onClick={() => {
                      setExportOptions({
                        format: 'excel',
                        type: 'invoices',
                        filters: { invoice_type: 'Attiva' },
                        include_details: true,
                      });
                      setTimeout(() => exportMutation.mutate({
                        format: 'excel',
                        type: 'invoices',
                        filters: { invoice_type: 'Attiva' },
                        include_details: true,
                      }), 100);
                    }}
                    disabled={exportMutation.isPending}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Fatture Attive (Excel)
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setTimeout(() => exportMutation.mutate({
                        format: 'csv',
                        type: 'transactions',
                        filters: { status_filter: 'Da Riconciliare' },
                      }), 100);
                    }}
                    disabled={exportMutation.isPending}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Transazioni da Riconciliare (CSV)
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setTimeout(() => exportMutation.mutate({
                        format: 'excel',
                        type: 'reconciliation-report',
                        include_details: true,
                      }), 100);
                    }}
                    disabled={exportMutation.isPending}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Report Riconciliazione Completo
                  </Button>
                </div>
                
                <Separator />
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => createBackupMutation.mutate()}
                  disabled={createBackupMutation.isPending}
                >
                  {createBackupMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="mr-2 h-4 w-4" />
                  )}
                  Backup Completo Sistema
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Export Status */}
          {exportMutation.isPending && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin" />
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
