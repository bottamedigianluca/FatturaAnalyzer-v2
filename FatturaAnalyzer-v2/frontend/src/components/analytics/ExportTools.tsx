import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Image,
  Share2,
  Mail,
  Link,
  Printer,
  Calendar,
  Settings,
  Zap,
  Clock,
  Users,
  CheckCircle,
  X,
  Sparkles,
  Database,
  Cloud,
  Shield,
} from 'lucide-react';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Input,
  Textarea,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Separator,
  RadioGroup,
  RadioGroupItem,
  Label,
  DatePicker,
} from '@/components/ui';

// Hooks
import { useUIStore } from '@/store';
import { useMutation } from '@tanstack/react-query';

// Utils
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';

// Types
interface ExportConfig {
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'png' | 'svg';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  includeCharts: boolean;
  includeData: boolean;
  includeAnalytics: boolean;
  includePredictions: boolean;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  customization: {
    logo: boolean;
    watermark: boolean;
    colors: string;
    template: string;
  };
  scheduling: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}

interface ShareConfig {
  type: 'link' | 'email' | 'embed';
  permissions: 'view' | 'edit' | 'admin';
  expiration: Date | null;
  password: string;
  allowDownload: boolean;
  trackViews: boolean;
  recipients: string[];
  message: string;
}

export function ExportTools({ 
  data, 
  chartRef, 
  title = "Analytics Report" 
}: {
  data?: any;
  chartRef?: React.RefObject<any>;
  title?: string;
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'pdf',
    quality: 'high',
    includeCharts: true,
    includeData: true,
    includeAnalytics: true,
    includePredictions: false,
    dateRange: {
      start: null,
      end: null,
    },
    customization: {
      logo: true,
      watermark: false,
      colors: 'brand',
      template: 'professional',
    },
    scheduling: {
      enabled: false,
      frequency: 'weekly',
      time: '09:00',
      recipients: [],
    },
  });

  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    type: 'link',
    permissions: 'view',
    expiration: null,
    password: '',
    allowDownload: true,
    trackViews: true,
    recipients: [],
    message: '',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { addNotification } = useUIStore();

  const exportMutation = useMutation({
    mutationFn: async (config: ExportConfig) => {
      setIsExporting(true);
      setExportProgress(0);

      // Simulate export process with progress updates
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setExportProgress(i);
      }

      // Simulate different export types
      switch (config.format) {
        case 'pdf':
          return { type: 'pdf', url: '/exports/report.pdf', size: '2.4 MB' };
        case 'excel':
          return { type: 'excel', url: '/exports/report.xlsx', size: '1.8 MB' };
        case 'csv':
          return { type: 'csv', url: '/exports/data.csv', size: '856 KB' };
        case 'png':
          return { type: 'image', url: '/exports/chart.png', size: '1.2 MB' };
        default:
          return { type: config.format, url: `/exports/report.${config.format}`, size: '1.5 MB' };
      }
    },
    onSuccess: (result) => {
      setIsExporting(false);
      setIsExportOpen(false);
      addNotification({
        type: 'success',
        title: 'Export Completato!',
        message: `File ${result.type.toUpperCase()} (${result.size}) pronto per il download`,
        duration: 5000,
        action: {
          label: 'Scarica',
          onClick: () => window.open(result.url, '_blank'),
        },
      });
    },
    onError: () => {
      setIsExporting(false);
      addNotification({
        type: 'error',
        title: 'Errore Export',
        message: 'Si è verificato un errore durante l\'export',
        duration: 5000,
      });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (config: ShareConfig) => {
      // Simulate share link generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        shareUrl: `https://analytics.example.com/shared/${Math.random().toString(36).substr(2, 9)}`,
        embedCode: `<iframe src="https://analytics.example.com/embed/${Math.random().toString(36).substr(2, 9)}" width="800" height="600"></iframe>`,
      };
    },
    onSuccess: (result) => {
      if (shareConfig.type === 'link') {
        navigator.clipboard.writeText(result.shareUrl);
        addNotification({
          type: 'success',
          title: 'Link Copiato!',
          message: 'Il link di condivisione è stato copiato negli appunti',
          duration: 3000,
        });
      } else if (shareConfig.type === 'embed') {
        navigator.clipboard.writeText(result.embedCode);
        addNotification({
          type: 'success',
          title: 'Codice Embed Copiato!',
          message: 'Il codice embed è stato copiato negli appunti',
          duration: 3000,
        });
      }
      setIsShareOpen(false);
    },
  });

  const formatOptions = [
    { value: 'pdf', label: 'PDF Report', icon: FileText, description: 'Documento completo con grafici e analisi' },
    { value: 'excel', label: 'Excel Workbook', icon: FileSpreadsheet, description: 'Foglio di calcolo con dati e grafici' },
    { value: 'csv', label: 'CSV Data', icon: Database, description: 'Solo dati in formato CSV' },
    { value: 'png', label: 'PNG Image', icon: Image, description: 'Immagine ad alta risoluzione' },
    { value: 'json', label: 'JSON Data', icon: Database, description: 'Dati strutturati in formato JSON' },
  ];

  const templateOptions = [
    { value: 'professional', label: 'Professionale', preview: '/templates/professional.png' },
    { value: 'modern', label: 'Moderno', preview: '/templates/modern.png' },
    { value: 'minimal', label: 'Minimale', preview: '/templates/minimal.png' },
    { value: 'colorful', label: 'Colorato', preview: '/templates/colorful.png' },
  ];

  return (
    <div className="flex items-center gap-2">
      {/* Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Esporta
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" />
              Esporta Analytics Report
            </DialogTitle>
            <DialogDescription>
              Configura e personalizza l'export del tuo report analytics
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="format" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="format">Formato</TabsTrigger>
              <TabsTrigger value="content">Contenuto</TabsTrigger>
              <TabsTrigger value="style">Stile</TabsTrigger>
              <TabsTrigger value="schedule">Programmazione</TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formatOptions.map((format) => {
                  const Icon = format.icon;
                  return (
                    <motion.div
                      key={format.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "p-4 border-2 rounded-lg cursor-pointer transition-all",
                        exportConfig.format === format.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => setExportConfig(prev => ({ ...prev, format: format.value as any }))}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          exportConfig.format === format.value
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{format.label}</h3>
                          <p className="text-sm text-gray-600">{format.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Qualità Export</Label>
                  <Select 
                    value={exportConfig.quality} 
                    onValueChange={(value: any) => setExportConfig(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Bassa (veloce, file piccolo)</SelectItem>
                      <SelectItem value="medium">Media (bilanciato)</SelectItem>
                      <SelectItem value="high">Alta (qualità superiore)</SelectItem>
                      <SelectItem value="ultra">Ultra (massima qualità)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Includi nel Report</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="charts"
                        checked={exportConfig.includeCharts}
                        onCheckedChange={(checked) => 
                          setExportConfig(prev => ({ ...prev, includeCharts: !!checked }))
                        }
                      />
                      <Label htmlFor="charts">Grafici e Visualizzazioni</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="data"
                        checked={exportConfig.includeData}
                        onCheckedChange={(checked) => 
                          setExportConfig(prev => ({ ...prev, includeData: !!checked }))
                        }
                      />
                      <Label htmlFor="data">Dati Tabellari</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="analytics"
                        checked={exportConfig.includeAnalytics}
                        onCheckedChange={(checked) => 
                          setExportConfig(prev => ({ ...prev, includeAnalytics: !!checked }))
                        }
                      />
                      <Label htmlFor="analytics">Analisi e KPI</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="predictions"
                        checked={exportConfig.includePredictions}
                        onCheckedChange={(checked) => 
                          setExportConfig(prev => ({ ...prev, includePredictions: !!checked }))
                        }
                      />
                      <Label htmlFor="predictions">Previsioni AI</Label>
                      <Badge className="bg-purple-100 text-purple-700">Beta</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Periodo Dati</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Data Inizio</Label>
                      <DatePicker
                        date={exportConfig.dateRange.start}
                        onDateChange={(date) => 
                          setExportConfig(prev => ({ 
                            ...prev, 
                            dateRange: { ...prev.dateRange, start: date } 
                          }))
                        }
                      />
                    </div>
                    
                    <div>
                      <Label>Data Fine</Label>
                      <DatePicker
                        date={exportConfig.dateRange.end}
                        onDateChange={(date) => 
                          setExportConfig(prev => ({ 
                            ...prev, 
                            dateRange: { ...prev.dateRange, end: date } 
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Template Design</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {templateOptions.map((template) => (
                      <motion.div
                        key={template.value}
                        whileHover={{ scale: 1.05 }}
                        className={cn(
                          "p-3 border-2 rounded-lg cursor-pointer transition-all text-center",
                          exportConfig.customization.template === template.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => setExportConfig(prev => ({ 
                          ...prev, 
                          customization: { ...prev.customization, template: template.value } 
                        }))}
                      >
                        <div className="w-full h-20 bg-gray-100 rounded mb-2 flex items-center justify-center">
                          <Image className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium">{template.label}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Personalizzazione</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Includi Logo Aziendale</Label>
                      <Switch
                        checked={exportConfig.customization.logo}
                        onCheckedChange={(checked) => 
                          setExportConfig(prev => ({ 
                            ...prev, 
                            customization: { ...prev.customization, logo: checked } 
                          }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Watermark</Label>
                      <Switch
                        checked={exportConfig.customization.watermark}
                        onCheckedChange={(checked) => 
                          setExportConfig(prev => ({ 
                            ...prev, 
                            customization: { ...prev.customization, watermark: checked } 
                          }))
                        }
                      />
                    </div>
                    
                    <div>
                      <Label>Schema Colori</Label>
                      <Select 
                        value={exportConfig.customization.colors}
                        onValueChange={(value) => 
                          setExportConfig(prev => ({ 
                            ...prev, 
                            customization: { ...prev.customization, colors: value } 
                          }))
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brand">Brand Aziendale</SelectItem>
                          <SelectItem value="blue">Blu Professionale</SelectItem>
                          <SelectItem value="green">Verde Natura</SelectItem>
                          <SelectItem value="purple">Viola Moderno</SelectItem>
                          <SelectItem value="monochrome">Monocromatico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Programmazione Export</h3>
                    <p className="text-sm text-gray-600">Genera automaticamente report periodici</p>
                  </div>
                  <Switch
                    checked={exportConfig.scheduling.enabled}
                    onCheckedChange={(checked) => 
                      setExportConfig(prev => ({ 
                        ...prev, 
                        scheduling: { ...prev.scheduling, enabled: checked } 
                      }))
                    }
                  />
                </div>

                {exportConfig.scheduling.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="space-y-4">
                      <div>
                        <Label>Frequenza</Label>
                        <Select 
                          value={exportConfig.scheduling.frequency}
                          onValueChange={(value: any) => 
                            setExportConfig(prev => ({ 
                              ...prev, 
                              scheduling: { ...prev.scheduling, frequency: value } 
                            }))
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Giornaliero</SelectItem>
                            <SelectItem value="weekly">Settimanale</SelectItem>
                            <SelectItem value="monthly">Mensile</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Orario</Label>
                        <Input
                          type="time"
                          value={exportConfig.scheduling.time}
                          onChange={(e) => 
                            setExportConfig(prev => ({ 
                              ...prev, 
                              scheduling: { ...prev.scheduling, time: e.target.value } 
                            }))
                          }
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Email Destinatari</Label>
                      <Textarea
                        placeholder="Inserisci email separate da virgola..."
                        value={exportConfig.scheduling.recipients.join(', ')}
                        onChange={(e) => 
                          setExportConfig(prev => ({ 
                            ...prev, 
                            scheduling: { 
                              ...prev.scheduling, 
                              recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                            } 
                          }))
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-6 border-t">
            <Button variant="outline" onClick={() => setIsExportOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={() => exportMutation.mutate(exportConfig)}
              disabled={exportMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {exportMutation.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Esportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Avvia Export
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Condividi
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-green-600" />
              Condividi Analytics Report
            </DialogTitle>
            <DialogDescription>
              Genera link sicuri per condividere i tuoi analytics
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="link" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="embed">Embed</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Permessi</Label>
                  <RadioGroup 
                    value={shareConfig.permissions} 
                    onValueChange={(value: any) => setShareConfig(prev => ({ ...prev, permissions: value }))}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="view" id="view" />
                      <Label htmlFor="view">Solo Visualizzazione</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="edit" id="edit" />
                      <Label htmlFor="edit">Modifica</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scadenza Link</Label>
                    <DatePicker
                      date={shareConfig.expiration}
                      onDateChange={(date) => setShareConfig(prev => ({ ...prev, expiration: date }))}
                    />
                  </div>
                  
                  <div>
                    <Label>Password (opzionale)</Label>
                    <Input
                      type="password"
                      value={shareConfig.password}
                      onChange={(e) => setShareConfig(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Inserisci password..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Consenti Download</Label>
                  <Switch
                    checked={shareConfig.allowDownload}
                    onCheckedChange={(checked) => setShareConfig(prev => ({ ...prev, allowDownload: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Traccia Visualizzazioni</Label>
                  <Switch
                    checked={shareConfig.trackViews}
                    onCheckedChange={(checked) => setShareConfig(prev => ({ ...prev, trackViews: checked }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Destinatari</Label>
                  <Textarea
                    placeholder="email1@example.com, email2@example.com"
                    value={shareConfig.recipients.join(', ')}
                    onChange={(e) => setShareConfig(prev => ({ 
                      ...prev, 
                      recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                    }))}
                  />
                </div>

                <div>
                  <Label>Messaggio</Label>
                  <Textarea
                    placeholder="Ciao, condivido con te questo report analytics..."
                    value={shareConfig.message}
                    onChange={(e) => setShareConfig(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="embed" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Genera un codice embed per integrare il report nel tuo sito web o dashboard
                </p>
                
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <code className="text-sm">
                    {`<iframe src="[URL_GENERATO]" width="800" height="600" frameborder="0"></iframe>`}
                  </code>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Responsive</Label>
                  <Switch defaultChecked />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-6 border-t">
            <Button variant="outline" onClick={() => setIsShareOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={() => {
                setShareConfig(prev => ({ ...prev, type: 'link' }));
                shareMutation.mutate(shareConfig);
              }}
              disabled={shareMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {shareMutation.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Genera Link
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Progress Modal */}
      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-8 max-w-md w-full mx-4"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-blue-300 border-t-blue-600 rounded-full mx-auto mb-6"
                />
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Generazione Report in Corso
                </h3>
                
                <p className="text-gray-600 mb-6">
                  Sto creando il tuo report personalizzato...
                </p>
                
                <div className="space-y-2">
                  <Progress value={exportProgress} className="w-full" />
                  <p className="text-sm text-gray-500">
                    {exportProgress}% completato
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Print Button */}
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-2" />
        Stampa
      </Button>
    </div>
  );
}

// Standalone Export Button for specific components
export function QuickExportButton({ 
  data, 
  filename = "export",
  format = "png" as "png" | "pdf" | "csv" | "json"
}: {
  data: any;
  filename?: string;
  format?: "png" | "pdf" | "csv" | "json";
}) {
  const { addNotification } = useUIStore();

  const handleQuickExport = async () => {
    try {
      // Simulate quick export
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addNotification({
        type: 'success',
        title: 'Export Rapido Completato',
        message: `File ${filename}.${format} scaricato con successo`,
        duration: 3000,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Errore Export',
        message: 'Si è verificato un errore durante l\'export rapido',
        duration: 3000,
      });
    }
  };

  const getIcon = () => {
    switch (format) {
      case 'pdf': return FileText;
      case 'csv': return Database;
      case 'json': return Database;
      case 'png': return Image;
      default: return Download;
    }
  };

  const Icon = getIcon();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleQuickExport}
      className="text-gray-500 hover:text-gray-700"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

// Scheduled Export Manager Component
export function ScheduledExportManager() {
  const [scheduledExports, setScheduledExports] = useState([
    {
      id: 1,
      name: 'Weekly Revenue Report',
      format: 'pdf',
      frequency: 'weekly',
      lastRun: '2024-12-01',
      nextRun: '2024-12-08',
      status: 'active',
      recipients: ['manager@company.com', 'cfo@company.com'],
    },
    {
      id: 2,
      name: 'Monthly Analytics Summary',
      format: 'excel',
      frequency: 'monthly',
      lastRun: '2024-11-01',
      nextRun: '2024-12-01',
      status: 'active',
      recipients: ['team@company.com'],
    },
    {
      id: 3,
      name: 'Daily KPI Dashboard',
      format: 'csv',
      frequency: 'daily',
      lastRun: '2024-12-01',
      nextRun: '2024-12-02',
      status: 'paused',
      recipients: ['operations@company.com'],
    },
  ]);

  return (
    <Card className="border-2 border-blue-200/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Export Programmati
        </CardTitle>
        <CardDescription>
          Gestisci i tuoi export automatici e programmati
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scheduledExports.map((exportItem) => (
            <motion.div
              key={exportItem.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold">{exportItem.name}</h4>
                  <Badge 
                    variant={exportItem.status === 'active' ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {exportItem.status === 'active' ? 'Attivo' : 'In Pausa'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {exportItem.format.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span>Frequenza: {exportItem.frequency}</span>
                  <span className="mx-2">•</span>
                  <span>Prossimo: {formatDate(exportItem.nextRun)}</span>
                  <span className="mx-2">•</span>
                  <span>{exportItem.recipients.length} destinatari</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setScheduledExports(prev => 
                      prev.map(item => 
                        item.id === exportItem.id 
                          ? { ...item, status: item.status === 'active' ? 'paused' : 'active' }
                          : item
                      )
                    );
                  }}
                >
                  {exportItem.status === 'active' ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
          >
            <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">Aggiungi Nuovo Export Programmato</p>
            <p className="text-sm text-gray-500">Automatizza la generazione di report periodici</p>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export History Component
export function ExportHistory() {
  const [exportHistory] = useState([
    {
      id: 1,
      name: 'Q4 Analytics Report',
      format: 'pdf',
      size: '2.4 MB',
      date: '2024-12-01 14:30',
      status: 'completed',
      downloadUrl: '/exports/q4-report.pdf',
    },
    {
      id: 2,
      name: 'Customer Segments Data',
      format: 'excel',
      size: '1.8 MB',
      date: '2024-12-01 10:15',
      status: 'completed',
      downloadUrl: '/exports/segments.xlsx',
    },
    {
      id: 3,
      name: 'Revenue Trends Chart',
      format: 'png',
      size: '856 KB',
      date: '2024-11-30 16:45',
      status: 'completed',
      downloadUrl: '/exports/trends.png',
    },
    {
      id: 4,
      name: 'Monthly KPI Report',
      format: 'pdf',
      size: '1.2 MB',
      date: '2024-11-30 09:20',
      status: 'failed',
      downloadUrl: null,
    },
  ]);

  return (
    <Card className="border-2 border-green-200/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-green-600" />
          Cronologia Export
        </CardTitle>
        <CardDescription>
          Visualizza e scarica i tuoi export recenti
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {exportHistory.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  item.status === 'completed' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                )}>
                  {item.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <div className="text-xs text-gray-500">
                    <span>{item.format.toUpperCase()}</span>
                    <span className="mx-1">•</span>
                    <span>{item.size}</span>
                    <span className="mx-1">•</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              </div>
              
              {item.status === 'completed' && item.downloadUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(item.downloadUrl, '_blank')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ExportTools;
