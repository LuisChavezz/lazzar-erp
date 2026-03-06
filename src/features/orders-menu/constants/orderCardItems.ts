import { ComprasIcon, ProduccionIcon, ProductVariantsIcon } from "@/src/components/Icons";

export interface OrderMenuCardItem {
  title: string;
  description?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  view: string;
  accentClass: string;
  accentBgClass: string;
  accentShadowClass: string;
}

export const orderMenuCards: OrderMenuCardItem[] = [
  {
    title: "Órdenes de Bordado",
    description: "Seguimiento y control de pedidos bordados",
    icon: ProductVariantsIcon,
    view: "embroidery-orders",
    accentClass: "text-sky-600 dark:text-sky-400",
    accentBgClass: "bg-sky-50 dark:bg-sky-500/10",
    accentShadowClass: "hover:shadow-sky-500/20 dark:hover:shadow-sky-500/25",
  },
  {
    title: "Órdenes de Producción",
    description: "Gestión de producción y avances operativos",
    icon: ProduccionIcon,
    view: "production-orders",
    accentClass: "text-emerald-600 dark:text-emerald-400",
    accentBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
    accentShadowClass: "hover:shadow-emerald-500/25 dark:hover:shadow-emerald-500/25",
  },
  {
    title: "Órdenes de Compra",
    description: "Control de compras y abastecimientos",
    icon: ComprasIcon,
    view: "purchase-orders",
    accentClass: "text-amber-600 dark:text-amber-400",
    accentBgClass: "bg-amber-50 dark:bg-amber-500/10",
    accentShadowClass: "hover:shadow-amber-500/20 dark:shadow-amber-500/25",
  },
];
