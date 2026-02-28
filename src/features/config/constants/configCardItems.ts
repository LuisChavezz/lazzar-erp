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


interface ConfigCardItem {
  title: string;
  description?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  view: string;
  adminOnly?: boolean;
  prefetchKey?: (string | number)[];
  prefetchFn?: () => Promise<unknown>;
}

export const configCards: ConfigCardItem[] = [
  {
    title: "Sucursales",
    description: "Gestión de sucursales operativas",
    icon: BuildingIcon,
    view: "branches",
    adminOnly: true,
    prefetchKey: ["branches"],
    prefetchFn: getBranches,
  },
  {
    title: "Almacenes",
    description: "Gestión de almacenes e inventarios",
    icon: InventariosIcon,
    view: "warehouses",
    adminOnly: true,
    prefetchKey: ["warehouses"],
    prefetchFn: getWarehouses,
  },
  {
    title: "Ubicaciones",
    description: "Gestión de ubicaciones físicas",
    icon: MapPinIcon,
    view: "locations",
    adminOnly: true,
  },
  {
    title: "Monedas",
    description: "Catálogo de monedas y tipos de cambio",
    icon: ListaPreciosIcon,
    view: "currencies",
    adminOnly: true,
    prefetchKey: ["currencies"],
    prefetchFn: getCurrencies,
  },
  {
    title: "Usuarios",
    description: "Administración de usuarios y accesos",
    icon: CapitalHumanoIcon,
    view: "users",
    adminOnly: true,
    prefetchKey: ["users"],
    prefetchFn: getUsers,
  },
  {
    title: "Información Fiscal",
    icon: InfoIcon,
    view: "sat",
    adminOnly: true,
  },
  {
    title: "Categorías de Producto",
    description: "Administración de categorías de productos",
    icon: ProductCategoriesIcon,
    view: "product-categories",
    adminOnly: true,
    prefetchKey: ["product-categories"],
    prefetchFn: getProductCategories,
  },
  {
    title: "Tipos de Producto",
    description: "Administración de tipos de productos",
    icon: ProductTypesIcon,
    view: "product-types",
    adminOnly: true,
    prefetchKey: ["product-types"],
    prefetchFn: getProductTypes,
  },
  {
    title: "Colores",
    description: "Administración de colores",
    icon: ColorsIcon,
    view: "colors",
    adminOnly: true,
    prefetchKey: ["colors"],
    prefetchFn: getColors,
  },
  {
    title: "Tallas",
    description: "Administración de tallas",
    icon: SizesIcon,
    view: "sizes",
    adminOnly: true,
    prefetchKey: ["sizes"],
    prefetchFn: getSizes,
  },
  {
    title: "Unidades de Medida",
    description: "Administración de unidades de medida",
    icon: UnitsIcon,
    view: "units",
    adminOnly: true,
  },
  {
    title: "Impuestos",
    description: "Administración de impuestos",
    icon: TaxIcon,
    view: "taxes",
    adminOnly: true,
  },
  {
    title: "SAT - claves de productos y servicios",
    description: "Administración de claves de productos y servicios",
    icon: SatProdServIcon,
    view: "sat-prod-serv",
    adminOnly: true,
  },
  {
    title: "SAT - claves de unidades",
    description: "Administración de claves de unidades",
    icon: SatUnitCodesIcon,
    view: "sat-unit-codes",
    adminOnly: true,
  },
  {
    title: "Productos",
    description: "Administración de productos",
    icon: ProductIcon,
    view: "products",
    adminOnly: true,
  },
  {
    title: "Variantes de Producto",
    description: "Administración de variantes de productos",
    icon: ProductVariantsIcon,
    view: "product-variants",
    adminOnly: true,
  }
];
