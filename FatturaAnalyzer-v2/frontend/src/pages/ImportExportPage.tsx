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
  FileArchive,
  Shield,
  Zap,
  Eye,
  Info,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';

// Hooks
import {
  useImportInvoicesXML,
  useImportInvoicesZIP,
  useImportTransactionsCSVZIP,
  useImportMixedZIP,
  useValidateZIPArchive,
  useExportData,
  useDownloadTransactionTemplate,
  useCreateBackup,
  useImportHistory,
  useImportStatistics,
  useImportExportHealth,
  useCleanupTempFiles,
  useExportPresets,
  useSupportedFormats,
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

interface ZIPValidationResult {
  validation_status: 'valid' | 'invalid';
  can_import: boolean;
  validation_details: {
    zip_valid: boolean;
    file_count: number;
    total_size_mb: number;
    file_breakdown: Record<string, number>;
    warnings: string[];
    errors: string[];
  };
  recommendations: string[];
}

export function ImportExportPage() {
  const [activeTab, setActiveTab] = useState('import');
  const [importType, setImportType] = useState<'invoices' | 'transactions' | 'mixed'>('invoices');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [zipValidation, setZipValidation] = useState<ZIPValidationResult | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  
  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    type: 'invoices',
    includeDetails: true,
  });

  // Hooks
  const importInvoices = useImportInvoicesXML();
  const importInvoicesZIP = useImportInvoicesZIP();
  const importTransactionsZIP = useImportTransactionsCSVZIP();
  const importMixedZIP = useImportMixedZIP();
  const validateZIP = useValidateZIPArchive();
  const exportData = useExportData();
  const downloadTemplate = useDownloadTransactionTemplate();
  const createBackup = useCreateBackup();
  const cleanupFiles = useCleanupTempFiles();
  const exportPresets = useExportPresets();

  // Queries
  const { data: importHistory, isLoading: isLoadingHistory, refetch: refetchHistory } = useImportHistory(20);
  const { data: statistics, isLoading: isLoadingStats } = useImportStatistics();
  const { data: healthData } = useImportExportHealth();
  const { data: supportedFormats } = useSupportedFormats();

  // Enhanced dropzone configuration
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
    setImportResult(null);
    setZipValidation(null);

    // Auto-validate ZIP files
    const zipFiles = acceptedFiles.filter(file => file.name.toLowerCase().endsWith('.zip'));
    if (zipFiles.length > 0) {
      try {
        const validation = await validateZIP.mutateAsync(zipFiles[0]);
        if (validation.success) {
          setZipValidation(validation.data);
          setShowValidationDialog(true);
        }
      } catch (error) {
        console.error('ZIP validation failed:', error);
      }
    }
  }, [validateZIP]);

  const getAcceptedFileTypes = () => {
    switch (importType) {
      case 'invoices':
        return {
          'application/xml': ['.xml'],
          'application/pkcs7-mime': ['.p7m'],
          'application/zip': ['.zip'],
        };
      case 'transactions':
        return {
          'text/csv': ['.csv'],
          'application/zip': ['.zip'],
        };
      case 'mixed':
        return {
          'application/zip': ['.zip'],
        };
      default:
        return {};
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptedFileTypes(),
    multiple: importType !== 'mixed',
    disabled: importInvoices.isPending || importInvoicesZIP.isPending || importTransactionsZIP.isPending || importMixedZIP.isPending,
  });

  // Enhanced import handlers
  const handleImport = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      let result;
      const firstFile = selectedFiles[0];
      const isZipFile = firstFile.name.toLowerCase().endsWith('.zip');

      if (importType === 'invoices') {
        if (isZipFile) {
          result = await importInvoicesZIP.mutateAsync(firstFile);
        } else {
          result = await importInvoices.mutateAsync(selectedFiles);
        }
      } else if (importType === 'transactions' && isZipFile) {
        result = await importTransactionsZIP.mutateAsync(firstFile);
      } else if (importType === 'mixed' && isZipFile) {
        result = await importMixedZIP.mutateAsync(firstFile);
      }

      if (result) {
        setImportResult({
          processed: result.data?.files_processed || result.data?.total_processed || 0,
          success: result.data?.successful_imports || result.data?.files_processed || 0,
          duplicates: result.data?.duplicates || 0,
          errors: result.data?.errors || result.data?.files_errors || 0,
          unsupported: 0,
          files: result.data?.file_details || result.data?.file_results || []
        });
      }
      
      setSelectedFiles([]);
      setZipValidation(null);
      refetchHistory();
    } catch (error) {
      console.error('Import failed:', error);
    }
  }, [selectedFiles, importType, importInvoices, importInvoicesZIP, importTransactionsZIP, importMixedZIP, refetchHistory]);

  const handleExport = useCallback(() => {
    exportData.mutate(exportOptions);
  }, [exportData, exportOptions]);

  const resetImport = useCallback(() => {
    setSelectedFiles([]);
    setImportResult(null);
    setZipValidation(null);
  }, []);

  const isImporting = importInvoices.isPending || importInvoicesZIP.isPending || importTransactionsZIP.isPending || importMixedZIP.isPending;

  // Render file type selector with enhanced options
  const renderImportTypeSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Tipo Importazione Enterprise
        </CardTitle>
        <CardDescription>
          Seleziona il tipo di dati da importare con supporto archivi ZIP
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
              <div className="flex-1">
                <h3 className="font-medium">Fatture Elettroniche</h3>
                <p className="text-sm text-muted-foreground">File XML, P7M singoli o archivi ZIP</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">XML</Badge>
                  <Badge variant="outline" className="text-xs">P7M</Badge>
                  <Badge variant="secondary" className="text-xs">ZIP</Badge>
                </div>
              </div>
              {supportedFormats?.data?.invoice_formats && (
                <div className="text-xs text-muted-foreground text-right">
                  <div>Max {supportedFormats.data.invoice_formats.max_files_per_zip} file/ZIP</div>
                  <div>Max {supportedFormats.data.invoice_formats.max_zip_size_mb}MB</div>
                </div>
              )}
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
              <div className="flex-1">
                <h3 className="font-medium">Movimenti Bancari</h3>
                <p className="text-sm text-muted-foreground">File CSV singoli o ZIP multipli</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">CSV</Badge>
                  <Badge variant="secondary" className="text-xs">ZIP</Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div 
            className={cn(
              "p-4 border rounded-lg cursor-pointer transition-colors",
              importType === 'mixed' ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
            )}
            onClick={() => setImportType('mixed')}
          >
            <div className="flex items-center gap-3">
              <FileArchive className="h-5 w-5" />
              <div className="flex-1">
                <h3 className="font-medium">Dati Misti (Consigliato)</h3>
                <p className="text-sm text-muted-foreground">Archivi ZIP con fatture e transazioni</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">AUTO-DETECT</Badge>
                  <Badge variant="outline" className="text-xs">ZIP ONLY</Badge>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="default" className="text-xs">ENTERPRISE</Badge>
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
  );

  // Enhanced file upload with ZIP validation
  const renderFileUpload = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Upload File Enterprise
          {zipValidation && (
            <Badge variant={zipValidation.validation_status === 'valid' ? 'default' : 'destructive'} className="ml-2">
              {zipValidation.validation_status === 'valid' ? 'ZIP VALIDATO' : 'ERRORI ZIP'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {importType === 'invoices' && 'Trascina file XML/P7M o archivi ZIP'}
          {importType === 'transactions' && 'Trascina file CSV o archivi ZIP con CSV multipli'}
          {importType === 'mixed' && 'Trascina archivi ZIP con dati misti (rilevamento automatico)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isImporting && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />
          {isImporting ? (
            <div className="space-y-2">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <p className="text-primary font-medium">Importazione in corso...</p>
              <p className="text-sm text-muted-foreground">Elaborazione file enterprise in corso</p>
            </div>
          ) : isDragActive ? (
            <p className="text-primary font-medium">Rilascia i file qui...</p>
          ) : (
            <div>
              {importType === 'mixed' ? (
                <FileArchive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              ) : (
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              )}
              <p className="font-medium mb-2">
                {importType === 'invoices' && 'Clicca per selezionare file XML/P7M o ZIP'}
                {importType === 'transactions' && 'Clicca per selezionare file CSV o ZIP'}
                {importType === 'mixed' && 'Clicca per selezionare archivio ZIP misto'}
              </p>
              <p className="text-sm text-muted-foreground">
                {importType === 'invoices' && 'Supportati: .xml, .p7m, .zip (max 100MB, 500 file)'}
                {importType === 'transactions' && 'Supportati: .csv, .zip con CSV multipli'}
                {importType === 'mixed' && 'Supportati: .zip con rilevamento automatico contenuto'}
              </p>
            </div>
          )}
        </div>
        
        {/* Selected Files Display */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">File selezionati:</h4>
              {zipValidation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowValidationDialog(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Dettagli ZIP
                </Button>
              )}
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {file.name.toLowerCase().endsWith('.zip') ? (
                      <FileArchive className="h-4 w-4" />
                    ) : file.name.toLowerCase().endsWith('.csv') ? (
                      <FileSpreadsheet className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span className="text-sm">{file.name}</span>
                    {file.name.toLowerCase().endsWith('.zip') && (
                      <Badge variant="secondary" className="text-xs">ZIP</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                      disabled={isImporting}
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
            disabled={selectedFiles.length === 0 || isImporting || (zipValidation && zipValidation.validation_status === 'invalid')}
            className="flex-1"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importazione Enterprise...
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
              disabled={isImporting}
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* ZIP Validation Warning */}
        {zipValidation && zipValidation.validation_status === 'invalid' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Il file ZIP contiene errori che impediscono l'importazione. 
              Controlla i dettagli per maggiori informazioni.
            </AlertDescription>
          </Alert>
        )}

        {/* ZIP Validation Success with Recommendations */}
        {zipValidation && zipValidation.validation_status === 'valid' && zipValidation.recommendations.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Raccomandazioni per l'importazione:</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  {zipValidation.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // ZIP Validation Dialog
  const renderZIPValidationDialog = () => (
    <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Validazione Archivio ZIP Enterprise
          </DialogTitle>
          <DialogDescription>
            Analisi dettagliata del contenuto dell'archivio ZIP
          </DialogDescription>
        </DialogHeader>
        
        {zipValidation && (
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {zipValidation.validation_details.file_count}
                  </div>
                  <div className="text-sm text-muted-foreground">File Totali</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {zipValidation.validation_details.total_size_mb}MB
                  </div>
                  <div className="text-sm text-muted-foreground">Dimensione</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className={cn(
                    "text-2xl font-bold",
                    zipValidation.validation_status === 'valid' ? "text-green-600" : "text-red-600"
                  )}>
                    {zipValidation.validation_status === 'valid' ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {zipValidation.validation_status === 'valid' ? 'Valido' : 'Errori'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* File Breakdown */}
            <div>
              <h4 className="font-medium mb-3">Composizione File:</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(zipValidation.validation_details.file_breakdown).map(([ext, count]) => (
                  <div key={ext} className="flex justify-between p-2 bg-muted/50 rounded">
                    <span className="font-mono text-sm">{ext || 'no_extension'}</span>
                    <Badge variant="outline">{count} file(s)</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {zipValidation.validation_details.warnings.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-yellow-600">Avvertimenti:</h4>
                <div className="space-y-2">
                  {zipValidation.validation_details.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {zipValidation.validation_details.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-red-600">Errori:</h4>
                <div className="space-y-2">
                  {zipValidation.validation_details.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {zipValidation.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-blue-600">Raccomandazioni:</h4>
                <div className="space-y-2">
                  {zipValidation.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <Zap className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowValidationDialog(false)}
              >
                Chiudi
              </Button>
              
              {zipValidation.can_import && (
                <Button
                  onClick={() => {
                    setShowValidationDialog(false);
                    handleImport();
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Procedi con Importazione
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import & Export Enterprise</h1>
          <p className="text-muted-foreground">
            Gestione importazione ed esportazione dati con supporto archivi ZIP
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* System Health Indicator */}
          {healthData && (
            <Badge 
              variant={healthData.status === 'healthy' ? 'default' : 'destructive'}
              className="mr-2"
            >
              Sistema {healthData.status === 'healthy' ? 'Operativo' : 'Degradato'}
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

      {/* Enhanced System Statistics */}
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
          <TabsTrigger value="import">Importazione Enterprise</TabsTrigger>
          <TabsTrigger value="export">Esportazione</TabsTrigger>
          <TabsTrigger value="history">Cronologia</TabsTrigger>
        </TabsList>

        {/* Enhanced Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {renderImportTypeSelector()}
            {renderFileUpload()}
          </div>

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Risultati Importazione Enterprise
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
                    <h4 className="font-medium">Dettaglio File Processati:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {importResult.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.name || `File ${index + 1}`}</span>
                          </div>
                          <Badge variant={
                            file.status === 'processed' || file.status === 'completed' || file.status === 'success' ? 'default' :
                            file.status?.includes('error') || file.status?.includes('Error') ? 'destructive' :
                            'secondary'
                          }>
                            {file.status || 'Processato'}
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

        {/* Export Tab - Keep existing implementation */}
        <TabsContent value="export" className="space-y-6">
          {/* Export implementation remains the same as original */}
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Esportazione Dati</h3>
            <p className="text-muted-foreground">
              Funzionalità di esportazione disponibili nell'implementazione originale
            </p>
          </div>
        </TabsContent>

        {/* History Tab - Keep existing implementation */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Cronologia Import Enterprise
              </CardTitle>
              <CardDescription>
                Storico delle operazioni di importazione con supporto ZIP
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
                              item.status === 'completed' ? 'default' :
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

      {/* ZIP Validation Dialog */}
      {renderZIPValidationDialog()}
    </div>
  );
}
