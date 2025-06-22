// frontend/src/components/ui/index.ts

// Questo è il barrel file completo per i componenti UI.
// Include tutti i componenti necessari all'applicazione.
export { Alert, AlertTitle, AlertDescription } from "./alert";
export { Badge, badgeVariants } from "./badge";
export type { BadgeProps } from "./badge";
export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./card";
export { Checkbox } from "./checkbox";
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
} from "./dialog";
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
} from "./dropdown-menu";
export { Input } from "./input";
export type { InputProps } from "./input";
export { Label } from "./label";
export { Progress } from "./progress";
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
} from "./select";
export { Separator } from "./separator";
export { Skeleton } from "./skeleton";
export { Slider } from "./slider"; // <- Aggiunto
export { Toaster } from "./sonner";
export { Switch } from "./switch"; // <- Aggiunto
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip";
export * from "./upload"; // Aggiungi questa riga
