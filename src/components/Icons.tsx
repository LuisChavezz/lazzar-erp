/**
 * Fachada de íconos — todos los íconos reutilizables de la aplicación.
 *
 * La mayoría provienen de lucide-react (v1.11+).
 * Se conservan como SVG inline únicamente:
 *  - LogoIcon          → logo del producto (4 círculos)
 *  - GoogleIcon        → logo "G" multicolor de Google
 *  - GoogleDriveIcon   → logo tricolor de Google Drive
 *  - GmailIcon         → logo de Gmail
 *  - GoogleCalendarIcon → logo de Google Calendar
 *  - OrderStatusPathIcon → path SVG dinámico, sin equivalente en Lucide
 */

import React from "react";
import {
  AlignLeft,
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  BarChart2,
  Bell,
  Building2,
  Calculator,
  CalendarCheck,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileCheck,
  FileCode2,
  FileSearch,
  FileText,
  Filter,
  FlaskConical,
  FolderOpen,
  Heart,
  HelpCircle,
  History,
  Home,
  Image as LucideImage,
  Inbox,
  Info,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Layers2,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Map,
  MapPin,
  Menu,
  MinusCircle,
  Monitor,
  Moon,
  MoreVertical,
  Package,
  PackageOpen,
  Palette,
  Pencil,
  PenSquare,
  Plus,
  PlusCircle,
  QrCode,
  RefreshCw,
  Ruler,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Sun,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  User,
  UserCog,
  Users,
  X,
  XCircle,
  List,
  Kanban,
} from "lucide-react";

// ─── Tipos comunes ────────────────────────────────────────────────────────────

type SvgProps = React.SVGProps<SVGSVGElement>;
type LucideProps = React.ComponentProps<typeof Plus>;

// ─── Íconos generales ─────────────────────────────────────────────────────────

export const PlusIcon = (props: LucideProps) => <Plus {...props} />;
export const DashboardIcon = (props: LucideProps) => <LayoutDashboard {...props} />;
export const SettingsIcon = (props: LucideProps) => <Settings {...props} />;
export const LogoutIcon = (props: LucideProps) => <LogOut {...props} />;
export const MenuIcon = (props: LucideProps) => <Menu {...props} />;
export const CloseIcon = (props: LucideProps) => <X {...props} />;
export const EditIcon = (props: LucideProps) => <Pencil {...props} />;
export const XIcon = (props: LucideProps) => <X {...props} />;
export const DeleteIcon = (props: LucideProps) => <Trash2 {...props} />;
export const ViewIcon = (props: LucideProps) => <Eye {...props} />;
export const EyeIcon = (props: LucideProps) => <Eye {...props} />;
export const EyeOffIcon = (props: LucideProps) => <EyeOff {...props} />;
export const TrendingUpIcon = (props: LucideProps) => <TrendingUp {...props} />;
export const DotsVerticalIcon = (props: LucideProps) => <MoreVertical {...props} />;
export const ClockIcon = (props: LucideProps) => <Clock {...props} />;
export const HistoryIcon = (props: LucideProps) => <History {...props} />;
export const BellIcon = (props: LucideProps) => <Bell {...props} />;
export const ErrorIcon = (props: LucideProps) => <AlertTriangle {...props} />;
export const CheckIcon = (props: LucideProps) => <Check {...props} />;
export const CheckCircleIcon = (props: LucideProps) => <CheckCircle {...props} />;
export const InfoIcon = (props: LucideProps) => <Info {...props} />;
export const SearchIcon = (props: LucideProps) => <Search {...props} />;
export const EmailIcon = (props: LucideProps) => <Mail {...props} />;
export const LockIcon = (props: LucideProps) => <Lock {...props} />;
export const ArrowLeftIcon = (props: LucideProps) => <ArrowLeft {...props} />;
export const SaveIcon = (props: LucideProps) => <Save {...props} />;
export const HeartIcon = (props: LucideProps) => <Heart {...props} />;
export const PhotoIcon = (props: LucideProps) => <LucideImage {...props} />;
export const BuildingIcon = (props: LucideProps) => <Building2 {...props} />;
export const ChevronRightIcon = (props: LucideProps) => <ChevronRight {...props} />;
export const ChevronLeftIcon = (props: LucideProps) => <ChevronLeft {...props} />;
export const ChevronUpIcon = (props: LucideProps) => <ChevronUp {...props} />;
export const ChevronDownIcon = (props: LucideProps) => <ChevronDown {...props} />;
export const MapPinIcon = (props: LucideProps) => <MapPin {...props} />;
export const LoadingSpinnerIcon = (props: LucideProps) => <Loader2 {...props} />;
export const RefreshIcon = (props: LucideProps) => <RefreshCw {...props} />;
export const UserIcon = (props: LucideProps) => <User {...props} />;
export const HelpIcon = (props: LucideProps) => <HelpCircle {...props} />;
export const FilterIcon = (props: LucideProps) => <Filter {...props} />;
export const HomeIcon = (props: LucideProps) => <Home {...props} />;
export const SyncIcon = (props: LucideProps) => <RefreshCw {...props} />;
export const InboxIcon = (props: LucideProps) => <Inbox {...props} />;
export const PaperPlaneIcon = (props: LucideProps) => <Send {...props} />;
export const StarIcon = (props: LucideProps) => <Star {...props} />;
export const PencilSquareIcon = (props: LucideProps) => <PenSquare {...props} />;
export const ExclamationTriangleIcon = (props: LucideProps) => <AlertTriangle {...props} />;
export const TasksIcon = (props: LucideProps) => <CalendarCheck {...props} />;
export const OperationsIcon = (props: LucideProps) => <AlignLeft {...props} />;
export const ExternalLinkIcon = (props: LucideProps) => <ExternalLink {...props} />;
export const RejectIcon = (props: LucideProps) => <XCircle {...props} />;
export const DownloadIcon = (props: LucideProps) => <Download {...props} />;
export const UploadIcon = (props: LucideProps) => <Upload {...props} />;
export const ShieldCheckIcon = (props: LucideProps) => <ShieldCheck {...props} />;
export const QrCodeIcon = (props: LucideProps) => <QrCode {...props} />;
export const SunIcon = (props: LucideProps) => <Sun {...props} />;
export const MoonIcon = (props: LucideProps) => <Moon {...props} />;
export const MonitorIcon = (props: LucideProps) => <Monitor {...props} />;
export const ListIcon = (props: LucideProps) => <List {...props} />;
export const KanbanBoardIcon = (props: LucideProps) => <Kanban {...props} />;

// ─── Íconos de módulos ERP ────────────────────────────────────────────────────

export const PedidosIcon = (props: LucideProps) => <ShoppingBag {...props} />;
export const ProduccionIcon = (props: LucideProps) => <FlaskConical {...props} />;
export const InventariosIcon = (props: LucideProps) => <Package {...props} />;
export const OrdenesIcon = (props: LucideProps) => <ClipboardList {...props} />;
export const RecepcionesIcon = (props: LucideProps) => <ArrowLeftRight {...props} />;
export const FacturacionIcon = (props: LucideProps) => <FileText {...props} />;
export const CxpIcon = (props: LucideProps) => <MinusCircle {...props} />;
export const CxcIcon = (props: LucideProps) => <PlusCircle {...props} />;
export const BancosIcon = (props: LucideProps) => <Landmark {...props} />;
export const ContabilidadIcon = (props: LucideProps) => <Calculator {...props} />;
export const ExistenciasIcon = (props: LucideProps) => <ClipboardList {...props} />;
export const ListaPreciosIcon = (props: LucideProps) => <DollarSign {...props} />;
export const RastrearGuiasIcon = (props: LucideProps) => <Map {...props} />;
export const ClientesIcon = (props: LucideProps) => <Users {...props} />;
export const EmbarquesIcon = (props: LucideProps) => <Truck {...props} />;
export const ReportesIcon = (props: LucideProps) => <BarChart2 {...props} />;
export const ComprasIcon = (props: LucideProps) => <ShoppingCart {...props} />;
export const CapitalHumanoIcon = (props: LucideProps) => <UserCog {...props} />;

// ─── Íconos de configuración de productos ────────────────────────────────────

export const ProductCategoriesIcon = (props: LucideProps) => <LayoutGrid {...props} />;
export const ProductTypesIcon = (props: LucideProps) => <Tag {...props} />;
export const ColorsIcon = (props: LucideProps) => <Palette {...props} />;
export const SizesIcon = (props: LucideProps) => <Ruler {...props} />;
export const UnitsIcon = (props: LucideProps) => <Layers {...props} />;
export const TaxIcon = (props: LucideProps) => <FileCheck {...props} />;
export const SatProdServIcon = (props: LucideProps) => <FileSearch {...props} />;
export const SatUnitCodesIcon = (props: LucideProps) => <FileCode2 {...props} />;
export const ProductIcon = (props: LucideProps) => <Package {...props} />;
export const ProductVariantsIcon = (props: LucideProps) => <PackageOpen {...props} />;
export const FolioIcon = (props: LucideProps) => <FolderOpen {...props} />;
export const SamplesIcon = (props: LucideProps) => <Layers2 {...props} />;

// ─── Íconos con relleno (filled) ─────────────────────────────────────────────

/** Ícono de advertencia relleno — AlertTriangle con fill */
export const WarningFilledIcon = (props: LucideProps) => (
  <AlertTriangle fill="currentColor" {...props} />
);

/** Corazón relleno */
export const HeartFilledIcon = (props: LucideProps) => (
  <Heart fill="currentColor" {...props} />
);

// ─── Íconos parametrizados ────────────────────────────────────────────────────

/** Flecha de tendencia direccional: "up" (defecto) o "down" */
export const TrendDirectionalIcon = (
  props: LucideProps & { direction?: "up" | "down" }
) => {
  const { direction = "up", ...rest } = props;
  return direction === "down" ? <TrendingDown {...rest} /> : <TrendingUp {...rest} />;
};

/** Ícono de tendencia para KPI: negativo muestra TrendingDown */
export const KpiTrendIcon = (
  props: LucideProps & { negative?: boolean }
) => {
  const { negative = false, ...rest } = props;
  return negative ? <TrendingDown {...rest} /> : <TrendingUp {...rest} />;
};

/**
 * Ícono de estado de orden con path SVG dinámico.
 */
export const OrderStatusPathIcon = (
  props: SvgProps & { path: string }
) => {
  const { path, ...svgProps } = props;
  return (
    <svg {...svgProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} />
    </svg>
  );
};

// ─── Logo del producto ────────────────────────────────────────────────────────

/** Logo principal de la aplicación (4 círculos) — se conserva como SVG inline */
export const LogoIcon = (props: SvgProps) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="4.706" cy="16" r="4.706" fill="currentColor" />
    <circle cx="16.001" cy="4.706" r="4.706" fill="currentColor" />
    <circle cx="16.001" cy="27.294" r="4.706" fill="currentColor" />
    <circle cx="27.294" cy="16" r="4.706" fill="currentColor" />
  </svg>
);

// ─── Íconos de servicios de Google (logos de marca) ──────────────────────────

/** Logo oficial de Google ("G" multicolor) — se conserva como SVG inline */
export const GoogleIcon = (props: SvgProps) => (
  <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/** Logo oficial de Google Drive (triángulo tricolor) — se conserva como SVG inline */
export const GoogleDriveIcon = (props: SvgProps) => (
  <svg {...props} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.8 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);

/** Logo de Gmail (sobre con forma "M" característica) — se conserva como SVG inline */
export const GmailIcon = (props: SvgProps) => (
  <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" fill="#ffffff" />
    <path d="M4 4l8 7 8-7H4z" fill="#EA4335" />
    <path d="M2 7v11l5.5-5.5z" fill="#C5221F" />
    <path d="M22 7v11l-5.5-5.5z" fill="#C5221F" />
  </svg>
);

/** Logo de Google Calendar (calendario con cabecera azul) — se conserva como SVG inline */
export const GoogleCalendarIcon = (props: SvgProps) => (
  <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="17" rx="2" fill="#ffffff" />
    <rect x="3" y="4" width="18" height="5" rx="2" fill="#4285F4" />
    <rect x="3" y="6.5" width="18" height="2.5" fill="#4285F4" />
    <path d="M8 2v4M16 2v4" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7.5" cy="13.5" r="1" fill="#4285F4" />
    <circle cx="12" cy="13.5" r="1" fill="#4285F4" />
    <circle cx="16.5" cy="13.5" r="1" fill="#4285F4" />
    <circle cx="7.5" cy="17.5" r="1" fill="#4285F4" />
    <circle cx="12" cy="17.5" r="1" fill="#EA4335" />
    <circle cx="16.5" cy="17.5" r="1" fill="#4285F4" />
  </svg>
);
