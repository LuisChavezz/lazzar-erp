import { getBranches } from "@/src/features/branches/services/actions";
import { getCurrencies } from "@/src/features/currency/services/actions";
import { getColors } from "@/src/features/colors/services/actions";
import { getSizes } from "@/src/features/sizes/services/actions";
import { getProductCategories } from "@/src/features/product-categories/services/actions";
import { getProductTypes } from "@/src/features/product-types/services/actions";
import { getUsers } from "@/src/features/users/services/actions";
import { getWarehouses } from "@/src/features/warehouses/services/actions";
import {
  BuildingIcon,
  MapPinIcon,
  InfoIcon,
  CapitalHumanoIcon,
  ListaPreciosIcon,
  InventariosIcon,
  ProductCategoriesIcon,
  ProductTypesIcon,
  ColorsIcon,
  SizesIcon,
  UnitsIcon,
  TaxIcon,
  SatProdServIcon,
  SatUnitCodesIcon,
  ProductIcon,
  ProductVariantsIcon
} from "@/src/components/Icons";
import { getSatInfo } from "../../sat/services/actions";
import { getTaxes } from "../../taxes/services/actions";
import { getUnitsOfMeasure } from "../../units-of-measure/services/actions";
import { getSatProdservCodes } from "../../sat-prodserv-codes/services/actions";
import { getSatUnitCodes } from "../../sat-unit-codes/services/actions";
import { getProducts } from "../../products/services/actions";
import { getProductVariants } from "../../product-variants/services/actions";


interface ConfigCardItem {
  title: string;
  description?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  view: string;
  group: string;
  adminOnly?: boolean;
  prefetchKey?: (string | number)[];
  prefetchFn?: () => Promise<unknown>;
}

interface ConfigGroupItem {
  group: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accentClass: string;
  accentBgClass: string;
  actionLabel: string;
}

export const configGroups: ConfigGroupItem[] = [
  {
    group: "Organización",
    title: "Organización",
    description: "Sucursales, almacenes y ubicaciones operativas.",
    icon: BuildingIcon,
    accentClass: "text-sky-600 dark:text-sky-400",
    accentBgClass: "bg-sky-50 dark:bg-sky-500/10",
    actionLabel: "Ver estructura",
  },
  {
    group: "Usuarios y Accesos",
    title: "Usuarios y Accesos",
    description: "Usuarios y control de accesos del sistema.",
    icon: CapitalHumanoIcon,
    accentClass: "text-rose-600 dark:text-rose-400",
    accentBgClass: "bg-rose-50 dark:bg-rose-500/10",
    actionLabel: "Gestionar usuarios",
  },
  {
    group: "Información Fiscal",
    title: "Información Fiscal",
    description: "Impuestos, monedas e información fiscal.",
    icon: InfoIcon,
    accentClass: "text-amber-600 dark:text-amber-400",
    accentBgClass: "bg-amber-50 dark:bg-amber-500/10",
    actionLabel: "Configurar fiscal",
  },
  {
    group: "Catálogo de Productos",
    title: "Catálogo de Productos",
    description: "Categorías, tipos, colores, tallas y unidades.",
    icon: ProductCategoriesIcon,
    accentClass: "text-blue-600 dark:text-blue-400",
    accentBgClass: "bg-blue-50 dark:bg-blue-500/10",
    actionLabel: "Ver catálogo",
  },
  {
    group: "SAT y CFDI",
    title: "SAT y CFDI",
    description: "Claves SAT de productos, servicios y unidades.",
    icon: SatProdServIcon,
    accentClass: "text-emerald-600 dark:text-emerald-400",
    accentBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
    actionLabel: "Ver claves SAT",
  },
  {
    group: "Productos",
    title: "Productos",
    description: "Productos y variantes comerciales.",
    icon: ProductIcon,
    accentClass: "text-violet-600 dark:text-violet-400",
    accentBgClass: "bg-violet-50 dark:bg-violet-500/10",
    actionLabel: "Gestionar productos",
  },
];

export const configCards: ConfigCardItem[] = [
  {
    title: "Sucursales",
    description: "Gestión de sucursales operativas",
    icon: BuildingIcon,
    view: "branches",
    group: "Organización",
    adminOnly: true,
    prefetchKey: ["branches"],
    prefetchFn: getBranches,
  },
  {
    title: "Almacenes",
    description: "Gestión de almacenes e inventarios",
    icon: InventariosIcon,
    view: "warehouses",
    group: "Organización",
    adminOnly: true,
    prefetchKey: ["warehouses"],
    prefetchFn: getWarehouses,
  },
  {
    title: "Ubicaciones",
    description: "Gestión de ubicaciones físicas",
    icon: MapPinIcon,
    view: "locations",
    group: "Organización",
    adminOnly: true,
  },
  {
    title: "Monedas",
    description: "Catálogo de monedas y tipos de cambio",
    icon: ListaPreciosIcon,
    view: "currencies",
    group: "Información Fiscal",
    adminOnly: true,
    prefetchKey: ["currencies"],
    prefetchFn: getCurrencies,
  },
  {
    title: "Usuarios",
    description: "Administración de usuarios y accesos",
    icon: CapitalHumanoIcon,
    view: "users",
    group: "Usuarios y Accesos",
    adminOnly: true,
    prefetchKey: ["users"],
    prefetchFn: getUsers,
  },
  {
    title: "Información fiscal",
    icon: InfoIcon,
    view: "sat",
    group: "Información Fiscal",
    adminOnly: true,
    prefetchKey: ["sat-info"],
    prefetchFn: getSatInfo,
  },
  {
    title: "Categorías de Producto",
    description: "Administración de categorías de productos",
    icon: ProductCategoriesIcon,
    view: "product-categories",
    group: "Catálogo de Productos",
    adminOnly: true,
    prefetchKey: ["product-categories"],
    prefetchFn: getProductCategories,
  },
  {
    title: "Tipos de Producto",
    description: "Administración de tipos de productos",
    icon: ProductTypesIcon,
    view: "product-types",
    group: "Catálogo de Productos",
    adminOnly: true,
    prefetchKey: ["product-types"],
    prefetchFn: getProductTypes,
  },
  {
    title: "Colores",
    description: "Administración de colores",
    icon: ColorsIcon,
    view: "colors",
    group: "Catálogo de Productos",
    adminOnly: true,
    prefetchKey: ["colors"],
    prefetchFn: getColors,
  },
  {
    title: "Tallas",
    description: "Administración de tallas",
    icon: SizesIcon,
    view: "sizes",
    group: "Catálogo de Productos",
    adminOnly: true,
    prefetchKey: ["sizes"],
    prefetchFn: getSizes,
  },
  {
    title: "Unidades de Medida",
    description: "Administración de unidades de medida",
    icon: UnitsIcon,
    view: "units",
    group: "Catálogo de Productos",
    adminOnly: true,
    prefetchKey: ["units-of-measure"],
    prefetchFn: getUnitsOfMeasure,
  },
  {
    title: "Impuestos",
    description: "Administración de impuestos",
    icon: TaxIcon,
    view: "taxes",
    group: "Información Fiscal",
    adminOnly: true,
    prefetchKey: ["taxes"],
    prefetchFn: getTaxes,
  },
  {
    title: "SAT - claves de productos y servicios",
    description: "Administración de claves de productos y servicios",
    icon: SatProdServIcon,
    view: "sat-prod-serv",
    group: "SAT y CFDI",
    adminOnly: true,
    prefetchKey: ["sat-prodserv-codes"],
    prefetchFn: getSatProdservCodes,
  },
  {
    title: "SAT - claves de unidades",
    description: "Administración de claves de unidades",
    icon: SatUnitCodesIcon,
    view: "sat-unit-codes",
    group: "SAT y CFDI",
    adminOnly: true,
    prefetchKey: ["sat-unit-codes"],
    prefetchFn: getSatUnitCodes,
  },
  {
    title: "Productos",
    description: "Administración de productos",
    icon: ProductIcon,
    view: "products",
    group: "Productos",
    adminOnly: true,
    prefetchKey: ["products"],
    prefetchFn: getProducts,
  },
  {
    title: "Variantes de Producto",
    description: "Administración de variantes de productos",
    icon: ProductVariantsIcon,
    view: "product-variants",
    group: "Productos",
    adminOnly: true,
    prefetchKey: ["product-variants"],
    prefetchFn: getProductVariants,
  },
];
