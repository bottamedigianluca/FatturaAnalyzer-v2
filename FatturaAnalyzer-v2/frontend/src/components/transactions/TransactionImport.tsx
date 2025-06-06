import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, FileText, Eye, EyeOff, Loader2 } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Hooks
import { 
  useImportTransactionsCSV, 
  useValidateTransactionsCSV,
  usePreviewTransactionsCSV,
  useDownloadTransactionTemplate,
  ValidationResult,
  CSVPreview
} from '@/hooks/useImportExport';
import { useUIStore } from '@/store';

// Utils
import { formatCurrency, formatDate } from '@/lib/formatters';
import { validateFile } from '@/utils/validators';
import { cn } from '@/lib/utils';

// Types
interface TransactionImportProps {
  onImportComplete?: (result: { success: number; duplicates: number; errors: number }) => void;
}

interface PreviewTransaction {
  DataContabile: string;
  Importo: number;
  Descrizione: string;
  CausaleABI?: number;
  [key: string]: any;
}

export function TransactionImport({ onImportComplete }: TransactionImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [previewData, setPreviewData] = useState<CSVPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useUIStore();
  
  // Hooks
  const importMutation = useImportTransactionsCSV();
  const validateMutation = useValidateTransactionsCSV();
  const previewMutation = usePreviewTransactionsCSV();
  const downloadTemplate = useDownloadTransactionTemplate();

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // File selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const validation = validateFile(selectedFile, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['csv'],
      allowedTypes: ['text/csv', 'application/csv']
    });

    if (!validation.isValid) {
      addNotification({
        type: 'error',
        title: 'File non valido',
        message: validation.error!,
        duration: 5000,
      });
      return;
    }

    setFile(selectedFile);
    
    // Reset previous data
    setValidationResult(null);
    setPreviewData(null);
    setShowPreview(false);
    setSelectedRows(new Set());

    // Avvia validazione automatica
    await validateFile(selectedFile);
  }, [addNotification]);

  // Validate file
  const validateFile = useCallback(async (file: File) => {
    try {
      const result = await validateMutation.mutateAsync(file);
      setValidationResult(result);
      
      if (result.valid) {
        // Se valido, ottieni anteprima
        const preview = await previewMutation.mutateAsync({ file, maxRows: 20 });
        setPreviewData(preview);
        setShowPreview(true);
        
        // Seleziona tutte le righe valide per default
        if (preview.success && preview.data) {
          setSelectedRows(new Set(preview.data.map((_, index) => index)));
        }
      }
    } catch (error) {
      // Errori gestiti dai mutation hooks
    }
  }, [validateMutation, previewMutation]);

  // Handle import execution
  const handleImport = useCallback(async () => {
    if (!file || !previewData || selectedRows.size === 0) return;

    try {
      const result = await importMutation.mutateAsync(file);
      
      if (onImportComplete) {
        onImportComplete({
          success: result.success,
          duplicates: result.duplicates,
          errors: result.errors
        });
      }

      // Reset state
      resetImport();

    } catch (error) {
      // Error is handled by the mutation hook
    }
  }, [file, previewData, selectedRows, importMutation, onImportComplete]);

  // Row selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && previewData?.data) {
      setSelectedRows(new Set(previewData.data.map((_, index) => index)));
    } else {
      setSelectedRows(new Set());
    }
  }, [previewData]);

  const handleSelectRow = useCallback((index: number, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate.mutate();
  }, [downloadTemplate]);

  const resetImport = useCallback(() => {
    setFile(null);
    setValidationResult(null);
    setPreviewData(null);
    setShowPreview(false);
    setSelectedRows(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Determine if we can proceed with import
  const canImport = file && validationResult?.valid && previewData?.success && selectedRows.size > 0;
  const isLoading = validateMutation.isPending || previewMutation.isPending || importMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importa Transazioni Bancarie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Template CSV
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Scarica il template per il formato corretto
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={downloadTemplate.isPending}
                className="border-blue-200 hover:bg-blue-100 dark:border-blue-800 dark:hover:bg-blue-900"
              >
                {downloadTemplate.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Scarica Template
              </Button>
            </div>

            {/* File Upload */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                dragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
                file && validationResult?.valid && "border-green-500 bg-green-50 dark:bg-green-950",
                file && !validationResult?.valid && validationResult !== null && "border-red-500 bg-red-50 dark:bg-red-950"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              
              {file ? (
                <div className="space-y-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-300">
                          Analisi file in corso...
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    </>
                  ) : validationResult?.valid ? (
                    <>
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">
                          File valido: {file.name}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {validationResult.statistics?.total_rows} transazioni trovate
                        </p>
                      </div>
                    </>
                  ) : validationResult && !validationResult.valid ? (
                    <>
                      <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-300">
                          Errore: {file.name}
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {validationResult.error}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileText className="h-12 w-12 text-gray-500 mx-auto" />
                      <div>
                        <p className="font-medium">
                          File selezionato: {file.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetImport}
                    className="mt-2"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rimuovi
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-lg font-medium">
                      Trascina il file CSV qui o clicca per selezionare
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Formato supportato: CSV
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dimensione massima: 10MB
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    Seleziona File
                  </Button>
                </div>
              )}
            </div>

            {/* Validation Results */}
            {validationResult && !validationResult.valid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errore validazione:</strong> {validationResult.error}
                  {validationResult.details && (
                    <div className="mt-1 text-sm">{validationResult.details}</div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Import Button */}
            {validationResult?.valid && previewData?.success && (
              <div className="flex gap-2">
                <Button
                  onClick={handleImport}
                  disabled={!canImport || isLoading}
                  className="flex-1"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importazione...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importa {selectedRows.size} Transazioni
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  disabled={isLoading}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Anteprima
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {validationResult?.valid && validationResult.statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistiche File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResult.statistics.total_rows}
                </div>
                <div className="text-sm text-muted-foreground">
                  Righe Totali
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {validationResult.statistics.valid_transactions}
                </div>
                <div className="text-sm text-muted-foreground">
                  Transazioni Valide
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(validationResult.statistics.amount_range.max - validationResult.statistics.amount_range.min)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Range Importi
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {validationResult.statistics.date_range.from && validationResult.statistics.date_range.to ? 
                    Math.ceil((new Date(validationResult.statistics.date_range.to).getTime() - 
                               new Date(validationResult.statistics.date_range.from).getTime()) / (1000 * 60 * 60 * 24)) : 0
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  Giorni Coperti
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Anteprima Importazione</DialogTitle>
            <DialogDescription>
              Verifica i dati prima di procedere con l'importazione
            </DialogDescription>
          </DialogHeader>

          {previewData?.success && (
            <div className="space-y-4 overflow-auto flex-1">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {previewData.data.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Transazioni Valide
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(previewData.summary.total_amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Importo Totale
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedRows.size}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Selezionate
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Date Range Info */}
              {previewData.summary.earliest_date && previewData.summary.latest_date && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Periodo:</span> {' '}
                      {formatDate(previewData.summary.earliest_date)} - {formatDate(previewData.summary.latest_date)}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">
                        ↑ {previewData.summary.positive_transactions} entrate
                      </span>
                      <span className="text-red-600">
                        ↓ {previewData.summary.negative_transactions} uscite
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Transazioni ({selectedRows.size}/{previewData.data.length} selezionate)
                  </h4>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedRows.size === previewData.data.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm">Seleziona tutto</span>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Importo</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead>Causale ABI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.data.map((transaction: PreviewTransaction, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(index)}
                              onCheckedChange={(checked) => handleSelectRow(index, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            {formatDate(transaction.DataContabile)}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "font-medium",
                              transaction.Importo >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {formatCurrency(transaction.Importo)}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.Descrizione}
                          </TableCell>
                          <TableCell>
                            {transaction.CausaleABI || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
            >
              Chiudi
            </Button>
            <Button
              onClick={handleImport}
              disabled={!canImport || isLoading}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importazione...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importa {selectedRows.size} Transazioni
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
