import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users,
  Building2,
  MapPin,
  Mail,
  Phone,
  CreditCard,
  FileText,
  Globe,
  CheckCircle,
  AlertTriangle,
  X,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  Plus,
  Edit,
  Trash2,
  Star,
  TrendingUp,
  DollarSign,
  Calendar,
  Hash,
  Shield,
  Zap,
  Target,
  Sparkles,
  Copy,
} from 'lucide-react';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Separator,
  Switch,
} from '@/components/ui';

// Hooks
import { useCreateAnagraphics, useUpdateAnagraphics, useDeleteAnagraphics } from '@/hooks/useAnagraphics';
import { useUIStore } from '@/store';

// Utils
import { formatCurrency, formatVATNumber, formatTaxCode, formatIBAN, formatPhoneNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// Types
import type { Anagraphics, AnagraphicsType } from '@/types';

// Validation schema
const anagraphicsSchema = z.object({
  type: z.enum(['Cliente', 'Fornitore'], {
    required_error: 'Il tipo è obbligatorio',
  }),
  denomination: z.string().min(2, 'La denominazione deve avere almeno 2 caratteri'),
  piva: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const cleaned = val.replace(/\s/g, '');
      return /^[A-Z]{2}[0-9]{11}$/.test(cleaned) || /^[0-9]{11}$/.test(cleaned);
    }, 'P.IVA non valida (formato: IT12345678901 o 12345678901)'),
  cf: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const cleaned = val.replace(/\s/g, '').toUpperCase();
      return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cleaned) || /^[0-9]{11}$/.test(cleaned);
    }, 'Codice Fiscale non valido'),
  address: z.string().optional(),
  cap: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[0-9]{5}$/.test(val);
    }, 'CAP deve essere di 5 cifre'),
  city: z.string().optional(),
  province: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[A-Z]{2}$/.test(val.toUpperCase());
    }, 'Provincia deve essere di 2 lettere (es. MI)'),
  country: z.string().default('IT'),
  iban: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const cleaned = val.replace(/\s/g, '').toUpperCase();
      return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(cleaned);
    }, 'IBAN non valido'),
  email: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }, 'Email non valida'),
  phone: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length >= 8 && cleaned.length <= 15;
    }, 'Numero di telefono non valido'),
  pec: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }, 'PEC non valida'),
  codice_destinatario: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[A-Z0-9]{7}$/.test(val.toUpperCase());
    }, 'Codice destinatario deve essere di 7 caratteri alfanumerici'),
});

type AnagraphicsFormData = z.infer<typeof anagraphicsSchema>;

interface AnagraphicsFormProps {
  anagraphics?: Anagraphics;
  onSuccess?: (anagraphics: Anagraphics) => void;
  onCancel?: () => void;
  embedded?: boolean;
  initialType?: AnagraphicsType;
}

// Italian provinces
const ITALIAN_PROVINCES = [
  'AG', 'AL', 'AN', 'AO', 'AR', 'AP', 'AT', 'AV', 'BA', 'BT', 'BL', 'BN', 'BG', 'BI', 'BO', 'BZ', 'BS', 'BR',
  'CA', 'CL', 'CB', 'CI', 'CE', 'CT', 'CZ', 'CH', 'CO', 'CS', 'CR', 'KR', 'CN', 'EN', 'FM', 'FE', 'FI', 'FG',
  'FC', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'SP', 'AQ', 'LT', 'LE', 'LC', 'LI', 'LO', 'LU', 'MC', 'MN', 'MS',
  'MT', 'ME', 'MI', 'MO', 'MB', 'NA', 'NO', 'NU', 'OG', 'OT', 'OR', 'PD', 'PA', 'PR', 'PV', 'PG', 'PU', 'PE',
  'PC', 'PI', 'PT', 'PN', 'PZ', 'PO', 'RG', 'RA', 'RC', 'RE', 'RI', 'RN', 'RM', 'RO', 'SA', 'VS', 'SS', 'SV',
  'SI', 'SR', 'SO', 'TA', 'TE', 'TR', 'TO', 'TP', 'TN', 'TV', 'TS', 'UD', 'VA', 'VE', 'VB', 'VC', 'VR', 'VV', 'VI', 'VT'
];

// Sample cities for autocomplete
const SAMPLE_CITIES = {
  'MI': ['Milano', 'Monza', 'Sesto San Giovanni', 'Cinisello Balsamo'],
  'RM': ['Roma', 'Fiumicino', 'Anzio', 'Tivoli'],
  'TO': ['Torino', 'Moncalieri', 'Collegno', 'Rivoli'],
  'NA': ['Napoli', 'Pozzuoli', 'Casoria', 'Afragola'],
  'FI': ['Firenze', 'Prato', 'Empoli', 'Scandicci'],
  'BO': ['Bologna', 'Imola', 'Casalecchio di Reno', 'San Lazzaro di Savena'],
};

export function AnagraphicsForm({ 
  anagraphics, 
  onSuccess, 
  onCancel, 
  embedded = false,
  initialType 
}: AnagraphicsFormProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [cityOptions, setCityOptions] = useState<string[]>([]);

  // Hooks
  const { addNotification } = useUIStore();
  const createAnagraphics = useCreateAnagraphics();
  const updateAnagraphics = useUpdateAnagraphics();
  const deleteAnagraphics = useDeleteAnagraphics();

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, dirtyFields },
    reset,
    trigger,
  } = useForm<AnagraphicsFormData>({
    resolver: zodResolver(anagraphicsSchema),
    defaultValues: anagraphics ? {
      type: anagraphics.type,
      denomination: anagraphics.denomination,
      piva: anagraphics.piva || '',
      cf: anagraphics.cf || '',
      address: anagraphics.address || '',
      cap: anagraphics.cap || '',
      city: anagraphics.city || '',
      province: anagraphics.province || '',
      country: anagraphics.country || 'IT',
      iban: anagraphics.iban || '',
      email: anagraphics.email || '',
      phone: anagraphics.phone || '',
      pec: anagraphics.pec || '',
      codice_destinatario: anagraphics.codice_destinatario || '',
    } : {
      type: initialType || 'Cliente',
      denomination: '',
      piva: '',
      cf: '',
      address: '',
      cap: '',
      city: '',
      province: '',
      country: 'IT',
      iban: '',
      email: '',
      phone: '',
      pec: '',
      codice_destinatario: '',
    },
    mode: 'onChange',
  });

  // Watch form values
  const watchedValues = watch();
  const watchedProvince = watch('province');
  const watchedType = watch('type');

  // Update city options when province changes
  useEffect(() => {
    if (watchedProvince && SAMPLE_CITIES[watchedProvince as keyof typeof SAMPLE_CITIES]) {
      setCityOptions(SAMPLE_CITIES[watchedProvince as keyof typeof SAMPLE_CITIES]);
    } else {
      setCityOptions([]);
    }
  }, [watchedProvince]);

  // Calculate validation progress
  useEffect(() => {
    const totalFields = Object.keys(watchedValues).length;
    const filledFields = Object.values(watchedValues).filter(value => value && value !== '').length;
    const errorCount = Object.keys(errors).length;
    
    let progress = (filledFields / totalFields) * 100;
    if (errorCount > 0) progress = Math.max(progress - (errorCount * 10), 0);
    
    setValidationProgress(Math.round(progress));
  }, [watchedValues, errors]);

  // Auto-format functions
  const handlePIVAFormat = useCallback((value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    if (cleaned.length === 11 && /^[0-9]+$/.test(cleaned)) {
      setValue('piva', `IT${cleaned}`, { shouldValidate: true });
    }
  }, [setValue]);

  const handleIBANFormat = useCallback((value: string) => {
    const formatted = formatIBAN(value);
    setValue('iban', formatted, { shouldValidate: true });
  }, [setValue]);

  const handlePhoneFormat = useCallback((value: string) => {
    const formatted = formatPhoneNumber(value);
    setValue('phone', formatted, { shouldValidate: true });
  }, [setValue]);

  // Submit handler
  const onSubmit = useCallback(async (data: AnagraphicsFormData) => {
    setIsValidating(true);
    
    try {
      if (anagraphics) {
        // Update existing
        const updated = await updateAnagraphics.mutateAsync({
          id: anagraphics.id,
          data: data as any,
        });
        onSuccess?.(updated);
        addNotification({
          type: 'success',
          title: 'Anagrafica aggiornata',
          message: `${data.denomination} è stata aggiornata con successo`,
        });
      } else {
        // Create new
        const created = await createAnagraphics.mutateAsync(data as any);
        onSuccess?.(created);
        addNotification({
          type: 'success',
          title: 'Anagrafica creata',
          message: `${data.denomination} è stata creata con successo`,
        });
        reset(); // Reset form for new entry
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [anagraphics, updateAnagraphics, createAnagraphics, onSuccess, addNotification, reset]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!anagraphics) return;
    
    if (confirm(`Eliminare l'anagrafica "${anagraphics.denomination}"?`)) {
      try {
        await deleteAnagraphics.mutateAsync(anagraphics.id);
        onCancel?.();
        addNotification({
          type: 'success',
          title: 'Anagrafica eliminata',
          message: `${anagraphics.denomination} è stata eliminata`,
        });
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  }, [anagraphics, deleteAnagraphics, onCancel, addNotification]);

  // Get field error message
  const getFieldError = (fieldName: keyof AnagraphicsFormData) => {
    return errors[fieldName]?.message;
  };

  // Check if field is valid
  const isFieldValid = (fieldName: keyof AnagraphicsFormData) => {
    return !errors[fieldName] && dirtyFields[fieldName];
  };

  // Calculate form completeness score
  const getCompletenessScore = () => {
    const requiredFields = ['type', 'denomination'];
    const optionalFields = ['piva', 'cf', 'address', 'city', 'email', 'phone'];
    
    const requiredScore = requiredFields.filter(field => 
      watchedValues[field as keyof typeof watchedValues]
    ).length / requiredFields.length * 50;
    
    const optionalScore = optionalFields.filter(field => 
      watchedValues[field as keyof typeof watchedValues]
    ).length / optionalFields.length * 50;
    
    return Math.round(requiredScore + optionalScore);
  };

  const completenessScore = getCompletenessScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {anagraphics ? <Edit className="h-6 w-6 text-blue-600" /> : <Plus className="h-6 w-6 text-green-600" />}
              {anagraphics ? 'Modifica Anagrafica' : 'Nuova Anagrafica'}
            </h2>
            <p className="text-gray-600 mt-1">
              {anagraphics ? `Modifica i dati di ${anagraphics.denomination}` : 'Aggiungi un nuovo cliente o fornitore'}
            </p>
          </div>

          {anagraphics && (
            <div className="flex items-center gap-2">
              <Badge variant={anagraphics.type === 'Cliente' ? 'success' : 'secondary'}>
                {anagraphics.type}
              </Badge>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Score: {anagraphics.score}/100</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress and Score */}
      <Card className="border-2 border-blue-200/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Completezza Form</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-blue-600">Score Qualità</p>
                <p className="text-xl font-bold text-blue-700">{completenessScore}%</p>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className={cn("h-4 w-4", isValid ? "text-green-500" : "text-gray-400")} />
                <span className={cn("text-sm", isValid ? "text-green-600" : "text-gray-600")}>
                  {isValid ? 'Validazione OK' : 'Da completare'}
                </span>
              </div>
            </div>
          </div>
          <Progress value={completenessScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Form Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Generale
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Fiscale
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Contatti
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Avanzate
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Informazioni Generali
                </CardTitle>
                <CardDescription>
                  Dati base dell'anagrafica clienti/fornitori
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Tipo Anagrafica *
                    </label>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={cn(
                            errors.type && "border-red-500",
                            isFieldValid('type') && "border-green-500"
                          )}>
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cliente">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-green-600" />
                                Cliente
                              </div>
                            </SelectItem>
                            <SelectItem value="Fornitore">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                Fornitore
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.type && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.type.message}
                      </p>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stato</label>
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Attivo</span>
                    </div>
                  </div>
                </div>

                {/* Denomination */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Denominazione / Ragione Sociale *
                  </label>
                  <Controller
                    name="denomination"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Inserisci denominazione completa"
                        className={cn(
                          errors.denomination && "border-red-500",
                          isFieldValid('denomination') && "border-green-500"
                        )}
                      />
                    )}
                  />
                  {errors.denomination && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.denomination.message}
                    </p>
                  )}
                  {isFieldValid('denomination') && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Denominazione valida
                    </p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Indirizzo
                  </label>
                  <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Via, Piazza, Corso..."
                        className={cn(
                          isFieldValid('address') && "border-green-500"
                        )}
                      />
                    )}
                  />
                </div>

                {/* CAP, City, Province */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CAP</label>
                    <Controller
                      name="cap"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="12345"
                          maxLength={5}
                          className={cn(
                            errors.cap && "border-red-500",
                            isFieldValid('cap') && "border-green-500"
                          )}
                        />
                      )}
                    />
                    {errors.cap && (
                      <p className="text-sm text-red-600">{errors.cap.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Città</label>
                    <Controller
                      name="city"
                      control={control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="Città"
                            list="cities"
                            className={cn(
                              isFieldValid('city') && "border-green-500"
                            )}
                          />
                          {cityOptions.length > 0 && (
                            <datalist id="cities">
                              {cityOptions.map(city => (
                                <option key={city} value={city} />
                              ))}
                            </datalist>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Provincia</label>
                    <Controller
                      name="province"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={cn(
                            errors.province && "border-red-500",
                            isFieldValid('province') && "border-green-500"
                          )}>
                            <SelectValue placeholder="Prov." />
                          </SelectTrigger>
                          <SelectContent>
                            {ITALIAN_PROVINCES.map(prov => (
                              <SelectItem key={prov} value={prov}>
                                {prov}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.province && (
                      <p className="text-sm text-red-600">{errors.province.message}</p>
                    )}
                  </div>
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Paese
                  </label>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IT">🇮🇹 Italia</SelectItem>
                          <SelectItem value="FR">🇫🇷 Francia</SelectItem>
                          <SelectItem value="DE">🇩🇪 Germania</SelectItem>
                          <SelectItem value="ES">🇪🇸 Spagna</SelectItem>
                          <SelectItem value="CH">🇨🇭 Svizzera</SelectItem>
                          <SelectItem value="AT">🇦🇹 Austria</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fiscal Tab */}
          <TabsContent value="fiscal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Dati Fiscali
                </CardTitle>
                <CardDescription>
                  Partita IVA, Codice Fiscale e dati per fatturazione elettronica
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* P.IVA and CF */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Partita IVA
                    </label>
                    <Controller
                      name="piva"
                      control={control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="IT12345678901"
                            className={cn(
                              errors.piva && "border-red-500",
                              isFieldValid('piva') && "border-green-500"
                            )}
                            onBlur={(e) => {
                              field.onBlur();
                              handlePIVAFormat(e.target.value);
                            }}
                          />
                          {isFieldValid('piva') && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          )}
                        </div>
                      )}
                    />
                    {errors.piva && (
                      <p className="text-sm text-red-600">{errors.piva.message}</p>
                    )}
                    {isFieldValid('piva') && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        P.IVA valida
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Codice Fiscale
                    </label>
                    <Controller
                      name="cf"
                      control={control}
                      render={({ field }) => (
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="RSSMRA80A01H501U"
                            className={cn(
                              errors.cf && "border-red-500",
                              isFieldValid('cf') && "border-green-500"
                            )}
                          />
                          {isFieldValid('cf') && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                          )}
                        </div>
                      )}
                    />
                    {errors.cf && (
                      <p className="text-sm text-red-600">{errors.cf.message}</p>
                    )}
                    {isFieldValid('cf') && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Codice Fiscale valido
                      </p>
                    )}
                  </div>
                </div>

                {/* Electronic Invoice Data */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Fatturazione Elettronica
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">PEC</label>
                      <Controller
                        name="pec"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="email"
                            placeholder="pec@example.it"
                            className={cn(
                              errors.pec && "border-red-500",
                              isFieldValid('pec') && "border-green-500"
                            )}
                          />
                        )}
                      />
                      {errors.pec && (
                        <p className="text-sm text-red-600">{errors.pec.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Codice Destinatario</label>
                      <Controller
                        name="codice_destinatario"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="ABCDEFG"
                            maxLength={7}
                            className={cn(
                              errors.codice_destinatario && "border-red-500",
                              isFieldValid('codice_destinatario') && "border-green-500"
                            )}
                            onChange={(e) => {
                              field.onChange(e.target.value.toUpperCase());
                            }}
                          />
                        )}
                      />
                      {errors.codice_destinatario && (
                        <p className="text-sm text-red-600">{errors.codice_destinatario.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-purple-600">
                    💡 La PEC o il Codice Destinatario sono necessari per la fatturazione elettronica B2B
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-green-600" />
                  Informazioni di Contatto
                </CardTitle>
                <CardDescription>
                  Email, telefono e coordinate bancarie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Email and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="email"
                          placeholder="email@example.com"
                          className={cn(
                            errors.email && "border-red-500",
                            isFieldValid('email') && "border-green-500"
                          )}
                        />
                      )}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefono
                    </label>
                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="tel"
                          placeholder="+39 123 456 7890"
                          className={cn(
                            errors.phone && "border-red-500",
                            isFieldValid('phone') && "border-green-500"
                          )}
                          onBlur={(e) => {
                            field.onBlur();
                            handlePhoneFormat(e.target.value);
                          }}
                        />
                      )}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* IBAN */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    IBAN
                  </label>
                  <Controller
                    name="iban"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="IT60 X054 2811 1010 0000 0123 456"
                        className={cn(
                          errors.iban && "border-red-500",
                          isFieldValid('iban') && "border-green-500"
                        )}
                        onBlur={(e) => {
                          field.onBlur();
                          handleIBANFormat(e.target.value);
                        }}
                      />
                    )}
                  />
                  {errors.iban && (
                    <p className="text-sm text-red-600">{errors.iban.message}</p>
                  )}
                  {isFieldValid('iban') && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      IBAN valido
                    </p>
                  )}
                </div>

                {/* Contact preferences */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Preferenze di Contatto</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="email-notifications" />
                      <label htmlFor="email-notifications" className="text-sm">
                        Notifiche via email
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="sms-notifications" />
                      <label htmlFor="sms-notifications" className="text-sm">
                        Notifiche via SMS
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="marketing-consent" />
                      <label htmlFor="marketing-consent" className="text-sm">
                        Consenso per comunicazioni commerciali
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  Impostazioni Avanzate
                </CardTitle>
                <CardDescription>
                  Configurazioni speciali e metadati
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quality Score Preview */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Score Qualità Anagrafica
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-700">
                        {completenessScore}
                      </div>
                      <div className="text-sm text-orange-600">Score Attuale</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700">
                        {Math.min(100, completenessScore + 15)}
                      </div>
                      <div className="text-sm text-green-600">Score Potenziale</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-orange-600">
                    💡 Completa tutti i campi per migliorare il punteggio e abilitare funzioni avanzate
                  </div>
                </div>

                {/* Tags and Categories */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Categoria Cliente</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enterprise">🏢 Enterprise</SelectItem>
                        <SelectItem value="sme">🏪 PMI</SelectItem>
                        <SelectItem value="startup">🚀 Startup</SelectItem>
                        <SelectItem value="freelance">👤 Freelance</SelectItem>
                        <SelectItem value="other">🔄 Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Settore</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona settore" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tech">💻 Tecnologia</SelectItem>
                        <SelectItem value="retail">🛒 Retail</SelectItem>
                        <SelectItem value="manufacturing">🏭 Manifatturiero</SelectItem>
                        <SelectItem value="services">🎯 Servizi</SelectItem>
                        <SelectItem value="healthcare">🏥 Sanità</SelectItem>
                        <SelectItem value="finance">💰 Finanza</SelectItem>
                        <SelectItem value="education">🎓 Educazione</SelectItem>
                        <SelectItem value="other">🔄 Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Termini di Pagamento Predefiniti
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Giorni Pagamento</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Immediato</SelectItem>
                          <SelectItem value="30">30 giorni</SelectItem>
                          <SelectItem value="60">60 giorni</SelectItem>
                          <SelectItem value="90">90 giorni</SelectItem>
                          <SelectItem value="120">120 giorni</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Metodo Pagamento</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bonifico">💳 Bonifico</SelectItem>
                          <SelectItem value="rid">🏦 RID</SelectItem>
                          <SelectItem value="carta">💳 Carta di Credito</SelectItem>
                          <SelectItem value="contanti">💵 Contanti</SelectItem>
                          <SelectItem value="assegno">📝 Assegno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Automation Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Automazioni
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Auto-riconciliazione</label>
                        <p className="text-xs text-gray-600">Riconciliazione automatica dei pagamenti</p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Solleciti automatici</label>
                        <p className="text-xs text-gray-600">Invio automatico di solleciti di pagamento</p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Backup documenti</label>
                        <p className="text-xs text-gray-600">Backup automatico dei documenti collegati</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center gap-3">
              {anagraphics && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </Button>
              )}
              
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                >
                  Annulla
                </Button>
              )}

              <Button
                type="submit"
                disabled={!isValid || isValidating}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isValidating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {anagraphics ? 'Aggiorna' : 'Salva'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Tabs>
    </div>
  );
}
