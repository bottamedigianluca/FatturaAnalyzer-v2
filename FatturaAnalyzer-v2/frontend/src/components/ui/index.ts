// --- Componenti Base ---
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from './card';

export { Input } from './input';
export type { InputProps } from './input';

export { Label } from './label';

export { Badge, badgeVariants } from './badge';
export type { BadgeProps } from './badge';

export { Checkbox } from './checkbox';

export { Skeleton } from './skeleton';

export { Toaster } from './sonner';

// --- Componenti di Layout e Struttura ---
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

export { Separator } from './separator';

// --- Componenti Interattivi e di Navigazione ---
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';

export { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent, 
  TooltipProvider 
} from './tooltip';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './tabs';

// --- Componenti di Input Avanzati ---
export { Slider } from './slider';
export { Switch } from './switch';
// Nota: DatePicker spesso non è un singolo componente ma una composizione. 
// Se hai un file date-picker.tsx, dovresti esportarlo qui.

// --- Componenti di Visualizzazione e Feedback ---
export { Progress } from './progress';

export {
  Alert,
  AlertTitle,
  AlertDescription,
} from './alert';

// --- Aggiungi qui altri componenti UI che potresti creare ---
// Esempio:
// export * from './avatar';
// export * from './calendar';
