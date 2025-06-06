import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, FileText, Eye, EyeOff } from 'lucide-react';

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

// Hooks
import { useImportTransactionsCSV, useDownloadTransactionTemplate } from '@/hooks/useTransactions';
import { useUIStore } from '@/store';

// Utils
import { formatCurrency, formatDate } from '@/lib/formatters';
import { validateFile, validateCSVFormat } from '@/utils/validators';
import { cn } from '@/lib/utils';

// Types
import type { BankTransaction } from '@/types';

interface ImportPreviewData {
  valid: BankTransaction[];
  invalid: Array<{ row: number; data: any; errors: string[] }>;
  duplicates: Array<{ row: number; data: any; reason: string }>;
}

interface TransactionImportProps {
  onImportComplete?: (result: { success: number; duplicates: number; errors: number }) => void;
}

export function TransactionImport({ onImportComplete }: TransactionImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [showDuplicates, setShowDuplicates] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNotification } = useUIStore();
  
  const importMutation = useImportTransactionsCSV();
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
  const handleFileSelect = useCallback((selectedFile: File) => {
    const validation = validateFile(selectedFile, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['csv', 'xlsx', 'xls'],
      allowedTypes: [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ]
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
    processFilePreview(selectedFile);
  }, [addNotification]);

  // Process file for preview
  const processFilePreview = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      
      // Simple CSV parsing (in production, use a proper CSV library)
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
      
      // Validate required columns
      const requiredColumns = ['transaction_date', 'amount', 'description'];
      const validation = validateCSVFormat(
        [Object.fromEntries(headers.map(h => [h, '']))], 
        requiredColumns
      );

      if (!validation.isValid) {
        addNotification({
          type: 'error',
          title: 'Formato CSV non valido',
          message: validation.error!,
          duration: 5000,
        });
        return;
      }

      // Parse data rows
      const dataRows = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
        const rowData = Object.fromEntries(
          headers.map((header, i) => [header, values[i] || ''])
        );
        return { row: index + 2, data: rowData }; // +2 because we skip header and are 1-indexed
      });

      // Validate and categorize rows
      const valid: BankTransaction[] = [];
      const invalid: Array<{ row: number; data: any; errors: string[] }> = [];
      const duplicates: Array<{ row: number; data: any; reason: string }> = [];

      for (const { row, data } of dataRows) {
        const errors: string[] = [];
        
        // Validate transaction_date
        if (!data.transaction_date) {
          errors.push('Data transazione richiesta');
        } else {
          const date = new Date(data.transaction_date);
          if (isNaN(date.getTime())) {
            errors.push('Data transazione non valida');
          }
        }

        // Validate amount
        if (!data.amount) {
          errors.push('Importo richiesto');
        } else {
          const amount = parseFloat(data.amount.replace(',', '.'));
          if (isNaN(amount)) {
            errors.push('Importo non valido');
          }
        }

        // Validate description
        if (!data.description || data.description.trim().length === 0) {
          errors.push('Descrizione richiesta');
        }

        if (errors.length > 0) {
          invalid.push({ row, data, errors });
        } else {
          // Check for duplicates (simplified logic)
          const existingTransaction = valid.find(t => 
            t.transaction_date === data.transaction_date &&
            Math.abs(parseFloat(t.amount.toString()) - parseFloat(data.amount.replace(',', '.'))) < 0.01 &&
            t.description === data.description
          );

          if (existingTransaction) {
            duplicates.push({ 
              row, 
              data, 
              reason: 'Transazione duplicata nel file' 
            });
          } else {
            // Create valid transaction object
            valid.push({
              id: 0, // Will be assigned by backend
              transaction_date: data.transaction_date,
              value_date: data.value_date || data.transaction_date,
              amount: parseFloat(data.amount.replace(',', '.')),
              description: data.description,
              causale_abi: data.causale_abi ? parseInt(data.causale_abi) : undefined,
              reconciliation_status: 'Da Riconciliare',
              reconciled_amount: 0,
              unique_hash: '', // Will be generated by backend
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      setPreviewData({ valid, invalid, duplicates });
      setShowPreview(true);
      
      // Select all valid rows by default
      setSelectedRows(new Set(valid.map((_, index) => index)));

    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Errore lettura file',
        message: 'Impossibile leggere il file selezionato',
        duration: 5000,
      });
    }
  }, [addNotification]);

  // Handle import execution
  const handleImport = useCallback(async () => {
    if (!file || !previewData) return;

    // Filter selected valid transactions
    const selectedTransactions = previewData.valid.filter((_, index) => 
      selectedRows.has(index)
    );

    if (selectedTransactions.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Nessuna transazione selezionata',
        message: 'Seleziona almeno una transazione da importare',
        duration: 3000,
      });
      return;
    }

    try {
      const result = await importMutation.mutateAsync(file);
      
      if (onImportComplete) {
        onImportComplete(result.data);
      }

      // Reset state
      setFile(null);
      setPreviewData(null);
      setShowPreview(false);
      setSelectedRows(new Set());
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      // Error is handled by the mutation
    }
  }, [file, previewData, selectedRows, importMutation, onImportComplete, addNotification]);

  // Row selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && previewData) {
      setSelectedRows(new Set(previewData.valid.map((_, index) => index)));
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
    setPreviewData(null);
    setShowPreview(false);
    setSelectedRows(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

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
                <Download className="h-4 w-4 mr-2" />
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
                file && "border-green-500 bg-green-50 dark:bg-green-950"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              
              {file ? (
                <div className="space-y-2">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">
                      File selezionato: {file.name}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetImport}
                    className="mt-2"
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
                      Trascina il file qui o clicca per selezionare
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Formati supportati: CSV, Excel (.xlsx, .xls)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dimensione massima: 10MB
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Seleziona File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Anteprima Importazione</DialogTitle>
            <DialogDescription>
              Verifica i dati prima di procedere con l'importazione
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4 overflow-auto flex-1">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {previewData.valid.length}
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
                      <div className="text-2xl font-bold text-red-600">
                        {previewData.invalid.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Errori
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {previewData.duplicates.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Duplicati
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filter Toggles */}
              <div className="flex gap-4">
                <Button
                  variant={showErrors ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowErrors(!showErrors)}
                  className="flex items-center gap-2"
                >
                  {showErrors ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Errori ({previewData.invalid.length})
                </Button>
                
                <Button
                  variant={showDuplicates ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowDuplicates(!showDuplicates)}
                  className="flex items-center gap-2"
                >
                  {showDuplicates ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Duplicati ({previewData.duplicates.length})
                </Button>
              </div>

              {/* Valid Transactions Table */}
              {previewData.valid.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Transazioni Valide ({selectedRows.size}/{previewData.valid.length} selezionate)
                    </h4>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedRows.size === previewData.valid.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm">Seleziona tutto</span>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg overflow-auto max-h-60">
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
                        {previewData.valid.map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Checkbox
                                checked={selectedRows.has(index)}
                                onCheckedChange={(checked) => handleSelectRow(index, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell>
                              {formatDate(transaction.transaction_date)}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "font-medium",
                                transaction.amount >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {formatCurrency(transaction.amount)}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {transaction.description}
                            </TableCell>
                            <TableCell>
                              {transaction.causale_abi || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Invalid Transactions */}
              {previewData.invalid.length > 0 && showErrors && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Errori ({previewData.invalid.length})
                  </h4>
                  
                  <div className="border rounded-lg overflow-auto max-h-60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Riga</TableHead>
                          <TableHead>Errori</TableHead>
                          <TableHead>Dati</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.invalid.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.row}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {item.errors.map((error, i) => (
                                  <Badge key={i} variant="destructive" className="text-xs">
                                    {error}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {JSON.stringify(item.data, null, 1).slice(0, 100)}...
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Duplicate Transactions */}
              {previewData.duplicates.length > 0 && showDuplicates && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-yellow-500" />
                    Duplicati ({previewData.duplicates.length})
                  </h4>
                  
                  <div className="border rounded-lg overflow-auto max-h-60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Riga</TableHead>
                          <TableHead>Motivo</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Importo</TableHead>
                          <TableHead>Descrizione</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.duplicates.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.row}</TableCell>
                            <TableCell>
                              <Badge variant="warning" className="text-xs">
                                {item.reason}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.data.transaction_date}</TableCell>
                            <TableCell>{item.data.amount}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {item.data.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
            >
              Annulla
            </Button>
            <Button
              onClick={handleImport}
              disabled={!previewData || selectedRows.size === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importazione...' : `Importa ${selectedRows.size} Transazioni`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
