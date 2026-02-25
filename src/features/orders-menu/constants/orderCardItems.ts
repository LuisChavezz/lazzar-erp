import { ComprasIcon, ProduccionIcon, ProductVariantsIcon } from "@/src/components/Icons";

export interface OrderMenuCardItem {
  title: string;
  description?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  view: string;
}

export const orderMenuCards: OrderMenuCardItem[] = [
  {
    title: "Órdenes de Bordado",
    description: "Seguimiento y control de pedidos bordados",
    icon: ProductVariantsIcon,
    view: "embroidery-orders",
  },
  {
    title: "Órdenes de Producción",
    description: "Gestión de producción y avances operativos",
    icon: ProduccionIcon,
    view: "production-orders",
  },
  {
    title: "Órdenes de Compra",
    description: "Control de compras y abastecimientos",
    icon: ComprasIcon,
    view: "purchase-orders",
  },
];
