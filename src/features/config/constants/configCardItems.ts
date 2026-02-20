import { getBranches } from "@/src/features/branches/services/actions";
import { getCurrencies } from "@/src/features/currency/services/actions";
import { getUsers } from "@/src/features/users/services/actions";
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
  ProductIcon
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
  },
  {
    title: "Tipos de Producto",
    description: "Administración de tipos de productos",
    icon: ProductTypesIcon,
    view: "product-types",
    adminOnly: true,
  },
  {
    title: "Colores",
    description: "Administración de colores",
    icon: ColorsIcon,
    view: "colors",
    adminOnly: true,
  },
  {
    title: "Tallas",
    description: "Administración de tallas",
    icon: SizesIcon,
    view: "sizes",
    adminOnly: true,
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
  }
];