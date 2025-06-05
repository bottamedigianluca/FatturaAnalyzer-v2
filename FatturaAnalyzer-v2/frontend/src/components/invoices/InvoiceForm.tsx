import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Calculator,
  Save,
  X,
  FileText,
  User,
  Calendar,
  Euro,
  Hash,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Search,
  Copy,
  Eye,
  Download,
} from 'lucide-react';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Separator,
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
} from '@/components/ui';

// Hooks
import { useCreateInvoice, useUpdateInvoice } from '@/hooks/useInvoices';
import { useUIStore } from '@/store';
import { apiClient } from '@/services/api';

// Utils
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { Invoice, InvoiceCreate, InvoiceUpdate, Anagraphics, InvoiceType, PaymentStatus } from '@/types';

// Validation schema
const invoiceLineSchema = z.object({
  line_number: z.number().min(1),
  description: z.string().min(1, 'Descrizione richiesta'),
  quantity: z.number().min(0.01, 'Quantità deve essere maggiore di 0'),
  unit_measure: z.string().optional(),
  unit_price: z.number().min(0, 'Prezzo unitario non può essere negativo'),
  total_price: z.number().min(0, 'Totale riga non può essere negativo'),
  vat_rate: z.number().min(0).max(100, 'Aliquota IVA non valida'),
  item_code: z.string().optional(),
  item_type: z.string().optional(),
});

const invoiceSchema = z.object({
  anagraphics_id: z.number().min(1, 'Cliente/Fornitore richiesto'),
  type: z.enum(['Attiva', 'Passiva']),
  doc_type: z.string().optional(),
  doc_number: z.string().min(1, 'Numero documento richiesto'),
  doc_date: z.string().min(1, 'Data documento richiesta'),
  total_amount: z.number().min(0.01, 'Importo totale deve essere maggiore di 0'),
  due_date: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, 'Almeno una riga è richiesta'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: Invoice;
  mode?: 'create' | 'edit' | 'view';
  onSuccess?: (invoice: Invoice) => void;
  onCancel?: () => void;
}

interface AnagraphicsSearchResult {
  id: number;
  denomination: string;
  piva?: string;
  cf?: string;
  city?: string;
  type: 'Cliente' | 'Fornitore';
}

export function InvoiceForm({
  invoice,
  mode = 'create',
  onSuccess,
  onCancel
}: InvoiceFormProps) {
  const [anagraphicsSearch, setAnagraphicsSearch] = useState('');
  const [anagraphicsResults, setAnagraphicsResults] = useState<AnagraphicsSearchResult[]>([]);
  const [selectedAnagraphics, setSelectedAnagraphics] = useState<AnagraphicsSearchResult | null>(null);
  const [showAnagraphicsSearch, setShowAnagraphicsSearch] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const { addNotification } = useUIStore();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const isReadOnly = mode === 'view';
  const isEditing = mode === 'edit';

  // Form setup
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      anagraphics_id: invoice?.anagraphics_id || 0,
      type: invoice?.type || 'Attiva',
      doc_type: invoice?.doc_type || 'Fattura',
      doc_number: invoice?.doc_number || '',
      doc_date: invoice?.doc_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      total_amount: invoice?.total_amount || 0,
      due_date: invoice?.due_date?.split('T')[0] || '',
      payment_method: invoice?.payment_method || 'Bonifico bancario',
      notes: invoice?.notes || '',
      lines: invoice?.lines?.map(line => ({
        line_number: line.line_number,
        description: line.description || '',
        quantity: line.quantity || 1,
        unit_measure: line.unit_measure || 'pz',
        unit_price: line.unit_price || 0,
        total_price: line.total_price,
        vat_rate: line.vat_rate,
        item_code: line.item_code || '',
        item_type: line.item_type || '',
      })) || [
        {
          line_number: 1,
          description: '',
          quantity: 1,
          unit_measure: 'pz',
          unit_price: 0,
          total_price: 0,
          vat_rate: 22,
          item_code: '',
          item_type: '',
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  // Load selected anagraphics data if editing
  useEffect(() => {
    if (invoice?.anagraphics_id) {
      apiClient.getAnagraphicsById(invoice.anagraphics_id)
        .then(anag => {
          setSelectedAnagraphics({
            id: anag.id,
            denomination: anag.denomination,
            piva: anag.piva,
            cf: anag.cf,
            city: anag.city,
            type: anag.type,
          });
        })
        .catch(console.error);
    }
  }, [invoice]);

  // Search anagraphics
  const handleAnagraphicsSearch = async (query: string) => {
    if (query.length < 2) {
      setAnagraphicsResults([]);
      return;
    }

    try {
      const response = await apiClient.searchAnagraphics(query);
      if (response.success && response.data) {
        setAnagraphicsResults(response.data.slice(0, 10));
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Calculate line totals
  const calculateLineTotal = (lineIndex: number) => {
    const quantity = form.watch(`lines.${lineIndex}.quantity`);
    const unitPrice = form.watch(`lines.${lineIndex}.unit_price`);
    const total = quantity * unitPrice;
    form.setValue(`lines.${lineIndex}.total_price`, total);
    calculateInvoiceTotal();
  };

  // Calculate invoice total
  const calculateInvoiceTotal = () => {
    setIsCalculating(true);
    const lines = form.watch('lines');
    const subtotal = lines.reduce((sum, line) => sum + line.total_price, 0);
    
    // Calculate VAT
    const vatByRate = lines.reduce((acc, line) => {
      const vatRate = line.vat_rate;
      if (!acc[vatRate]) acc[vatRate] = 0;
      acc[vatRate] += line.total_price;
      return acc;
    }, {} as Record<number, number>);

    const totalVat = Object.entries(vatByRate).reduce((sum, [rate, taxableAmount]) => {
      return sum + (taxableAmount * parseFloat(rate)) / 100;
    }, 0);

    const total = subtotal + totalVat;
    form.setValue('total_amount', Math.round(total * 100) / 100);
    
    setTimeout(() => setIsCalculating(false), 300);
  };

  // Add new line
  const addLine = () => {
    const newLineNumber = fields.length + 1;
    append({
      line_number: newLineNumber,
      description: '',
      quantity: 1,
      unit_measure: 'pz',
      unit_price: 0,
      total_price: 0,
      vat_rate: 22,
      item_code: '',
      item_type: '',
    });
  };

  // Remove line
  const removeLine = (index: number) => {
    if (fields.length > 1) {
      remove(index);
      // Renumber lines
      fields.forEach((_, idx) => {
        if (idx > index) {
          form.setValue(`lines.${idx - 1}.line_number`, idx);
        }
      });
      calculateInvoiceTotal();
    }
  };

  // Copy line
  const copyLine = (index: number) => {
    const line = form.watch(`lines.${index}`);
    const newLine = {
      ...line,
      line_number: fields.length + 1,
    };
    append(newLine);
  };

  // Submit form
  const onSubmit = async (data: InvoiceFormData) => {
    try {
      if (mode === 'create') {
        const newInvoice = await createInvoice.mutateAsync({
          ...data,
          lines: data.lines.map(line => ({
            line_number: line.line_number,
            description: line.description,
            quantity: line.quantity,
            unit_measure: line.unit_measure,
            unit_price: line.unit_price,
            total_price: line.total_price,
            vat_rate: line.vat_rate,
            item_code: line.item_code,
            item_type: line.item_type,
          })),
        });
        onSuccess?.(newInvoice);
      } else if (mode === 'edit' && invoice) {
        const updatedInvoice = await updateInvoice.mutateAsync({
          id: invoice.id,
          data: data as InvoiceUpdate,
        });
        onSuccess?.(updatedInvoice);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Calculate summary
  const formData = form.watch();
  const subtotal = formData.lines?.reduce((sum, line) => sum + line.total_price, 0) || 0;
  const vatByRate = formData.lines?.reduce((acc, line) => {
    const vatRate = line.vat_rate || 0;
    if (!acc[vatRate]) acc[vatRate] = 0;
    acc[vatRate] += line.total_price || 0;
    return acc;
  }, {} as Record<number, number>) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            {mode === 'create' ? 'Nuova Fattura' : 
             mode === 'edit' ? 'Modifica Fattura' : 'Visualizza Fattura'}
          </h2>
          {invoice && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {invoice.doc_number} - {formatDate(invoice.doc_date)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {mode === 'view' && (
            <>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Scarica PDF
              </Button>
              <Button variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Duplica
              </Button>
            </>
          )}
          
          {!isReadOnly && (
            <>
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Annulla
              </Button>
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={createInvoice.isPending || updateInvoice.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? 'Crea Fattura' : 'Salva Modifiche'}
              </Button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Informazioni Documento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type">Tipo Fattura</Label>
                    <Controller
                      name="type"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={isReadOnly}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Attiva">Fattura Attiva (Vendita)</SelectItem>
                            <SelectItem value="Passiva">Fattura Passiva (Acquisto)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor="doc_number">Numero Documento</Label>
                    <Input
                      id="doc_number"
                      {...form.register('doc_number')}
                      placeholder="es. FT-2024-001"
                      disabled={isReadOnly}
                    />
                    {form.formState.errors.doc_number && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.doc_number.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="doc_type">Tipo Documento</Label>
                    <Controller
                      name="doc_type"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value || 'Fattura'} onValueChange={field.onChange} disabled={isReadOnly}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fattura">Fattura</SelectItem>
                            <SelectItem value="Nota di credito">Nota di credito</SelectItem>
                            <SelectItem value="Nota di debito">Nota di debito</SelectItem>
                            <SelectItem value="Ricevuta">Ricevuta</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="doc_date">Data Documento</Label>
                    <Input
                      id="doc_date"
                      type="date"
                      {...form.register('doc_date')}
                      disabled={isReadOnly}
                    />
                    {form.formState.errors.doc_date && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.doc_date.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="due_date">Data Scadenza</Label>
                    <Input
                      id="due_date"
                      type="date"
                      {...form.register('due_date')}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="payment_method">Modalità di Pagamento</Label>
                  <Controller
                    name="payment_method"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value || 'Bonifico bancario'} onValueChange={field.onChange} disabled={isReadOnly}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bonifico bancario">Bonifico bancario</SelectItem>
                          <SelectItem value="Contanti">Contanti</SelectItem>
                          <SelectItem value="Assegno">Assegno</SelectItem>
                          <SelectItem value="Carta di credito">Carta di credito</SelectItem>
                          <SelectItem value="PayPal">PayPal</SelectItem>
                          <SelectItem value="RID">RID</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Customer/Supplier Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {form.watch('type') === 'Attiva' ? 'Cliente' : 'Fornitore'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAnagraphics ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">{selectedAnagraphics.denomination}</p>
                        <div className="flex gap-4 text-sm text-gray-600">
                          {selectedAnagraphics.piva && <span>P.IVA: {selectedAnagraphics.piva}</span>}
                          {selectedAnagraphics.cf && <span>C.F.: {selectedAnagraphics.cf}</span>}
                          {selectedAnagraphics.city && <span>{selectedAnagraphics.city}</span>}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {selectedAnagraphics.type}
                        </Badge>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAnagraphics(null);
                          form.setValue('anagraphics_id', 0);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : !isReadOnly ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder={`Cerca ${form.watch('type') === 'Attiva' ? 'cliente' : 'fornitore'}...`}
                          value={anagraphicsSearch}
                          onChange={(e) => {
                            setAnagraphicsSearch(e.target.value);
                            handleAnagraphicsSearch(e.target.value);
                          }}
                          className="pl-10"
                        />
                      </div>
                      <Button type="button" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuovo
                      </Button>
                    </div>

                    {anagraphicsResults.length > 0 && (
                      <div className="border rounded-lg max-h-48 overflow-y-auto">
                        {anagraphicsResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              setSelectedAnagraphics(result);
                              form.setValue('anagraphics_id', result.id);
                              setAnagraphicsSearch('');
                              setAnagraphicsResults([]);
                            }}
                          >
                            <div>
                              <p className="font-medium">{result.denomination}</p>
                              <div className="flex gap-3 text-sm text-gray-600">
                                {result.piva && <span>P.IVA: {result.piva}</span>}
                                {result.city && <span>{result.city}</span>}
                              </div>
                            </div>
                            <Badge variant="outline">{result.type}</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {form.formState.errors.anagraphics_id && (
                      <p className="text-sm text-red-600">
                        Seleziona un cliente/fornitore
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Nessun cliente/fornitore selezionato</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Lines */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Righe Fattura
                  </CardTitle>
                  {!isReadOnly && (
                    <Button type="button" onClick={addLine} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Riga
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <AnimatePresence>
                    {fields.map((field, index) => (
                      <motion.div
                        key={field.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Riga {index + 1}</h4>
                          <div className="flex items-center gap-2">
                            {!isReadOnly && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyLine(index)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                {fields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeLine(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <Label htmlFor={`lines.${index}.description`}>Descrizione</Label>
                            <Textarea
                              {...form.register(`lines.${index}.description`)}
                              placeholder="Descrizione del prodotto/servizio"
                              disabled={isReadOnly}
                              rows={2}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`lines.${index}.quantity`}>Quantità</Label>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`lines.${index}.quantity`, { 
                                valueAsNumber: true,
                                onChange: () => calculateLineTotal(index)
                              })}
                              disabled={isReadOnly}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`lines.${index}.unit_measure`}>Unità di Misura</Label>
                            <Input
                              {...form.register(`lines.${index}.unit_measure`)}
                              placeholder="pz, kg, ore..."
                              disabled={isReadOnly}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`lines.${index}.unit_price`}>Prezzo Unitario</Label>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`lines.${index}.unit_price`, { 
                                valueAsNumber: true,
                                onChange: () => calculateLineTotal(index)
                              })}
                              disabled={isReadOnly}
                            />
                          </div>

                          <div>
                            <Label htmlFor={`lines.${index}.vat_rate`}>IVA %</Label>
                            <Controller
                              name={`lines.${index}.vat_rate`}
                              control={form.control}
                              render={({ field }) => (
                                <Select 
                                  value={field.value?.toString()} 
                                  onValueChange={(value) => {
                                    field.onChange(parseFloat(value));
                                    calculateLineTotal(index);
                                  }}
                                  disabled={isReadOnly}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0% - Esente</SelectItem>
                                    <SelectItem value="4">4% - Ridotta</SelectItem>
                                    <SelectItem value="5">5% - Ridotta</SelectItem>
                                    <SelectItem value="10">10% - Ridotta</SelectItem>
                                    <SelectItem value="22">22% - Ordinaria</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          <div>
                            <Label>Totale Riga</Label>
                            <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                              <span className="font-medium">
                                {formatCurrency(form.watch(`lines.${index}.total_price`) || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Note</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...form.register('notes')}
                  placeholder="Note aggiuntive (opzionale)"
                  disabled={isReadOnly}
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Invoice Summary */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Riepilogo Fattura
                  {isCalculating && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Calculator className="h-4 w-4 text-blue-600" />
                    </motion.div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subtotal */}
                <div className="flex justify-between">
                  <span>Imponibile:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>

                {/* VAT breakdown */}
                {Object.entries(vatByRate).map(([rate, taxableAmount]) => {
                  const vatAmount = (taxableAmount * parseFloat(rate)) / 100;
                  return (
                    <div key={rate} className="flex justify-between text-sm">
                      <span>IVA {rate}%:</span>
                      <span>{formatCurrency(vatAmount)}</span>
                    </div>
                  );
                })}

                <Separator />

                {/* Total */}
                <div className="flex justify-between text-lg font-bold">
                  <span>Totale:</span>
                  <span className="text-blue-600">
                    {formatCurrency(form.watch('total_amount') || 0)}
                  </span>
                </div>

                {/* Payment info */}
                {form.watch('due_date') && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>Scadenza: {formatDate(form.watch('due_date'))}</span>
                    </div>
                    {form.watch('payment_method') && (
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <CreditCard className="h-4 w-4 text-gray-500" />
                        <span>{form.watch('payment_method')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions for view mode */}
                {mode === 'view' && invoice && (
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Stato:</span>
                      <Badge variant={
                        invoice.payment_status === 'Pagata Tot.' ? 'default' :
                        invoice.payment_status === 'Scaduta' ? 'destructive' :
                        'secondary'
                      }>
                        {invoice.payment_status}
                      </Badge>
                    </div>
                    
                    {invoice.paid_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Pagato:</span>
                        <span className="text-green-600">{formatCurrency(invoice.paid_amount)}</span>
                      </div>
                    )}
                    
                    {invoice.open_amount && invoice.open_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Residuo:</span>
                        <span className="text-orange-600">{formatCurrency(invoice.open_amount)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Validation errors */}
                {Object.keys(form.formState.errors).length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Correggi gli errori nel form</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {!isReadOnly && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Azioni Rapide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={calculateInvoiceTotal}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Ricalcola Totali
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // Auto-set due date to +30 days
                      const docDate = new Date(form.watch('doc_date'));
                      const dueDate = new Date(docDate);
                      dueDate.setDate(dueDate.getDate() + 30);
                      form.setValue('due_date', dueDate.toISOString().split('T')[0]);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Scadenza +30gg
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // Apply standard VAT to all lines
                      fields.forEach((_, index) => {
                        form.setValue(`lines.${index}.vat_rate`, 22);
                      });
                      calculateInvoiceTotal();
                    }}
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    IVA 22% su tutto
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Document Info */}
            {mode === 'view' && invoice && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Info Documento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Creata il:</span>
                    <span>{formatDate(invoice.created_at)}</span>
                  </div>
                  
                  {invoice.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Modificata il:</span>
                      <span>{formatDate(invoice.updated_at)}</span>
                    </div>
                  )}

                  {invoice.xml_filename && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">File XML:</span>
                      <span className="text-blue-600 cursor-pointer hover:underline">
                        {invoice.xml_filename}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">Hash:</span>
                    <span className="font-mono text-xs break-all">
                      {invoice.unique_hash}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips for new users */}
            {mode === 'create' && (
              <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                    Suggerimenti
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Usa il numero documento progressivo (es. FT-2024-001)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Seleziona prima il cliente/fornitore</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>I totali si calcolano automaticamente</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Puoi copiare righe esistenti</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Mobile Summary (visible only on small screens) */}
        <div className="lg:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Totale Fattura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(form.watch('total_amount') || 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Imponibile: {formatCurrency(subtotal)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Submit buttons for mobile */}
      {!isReadOnly && (
        <div className="lg:hidden flex gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Annulla
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={createInvoice.isPending || updateInvoice.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {mode === 'create' ? 'Crea' : 'Salva'}
          </Button>
        </div>
      )}
    </div>
  );
}
