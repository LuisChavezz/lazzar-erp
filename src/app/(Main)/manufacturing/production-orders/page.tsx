import type { Metadata } from "next";
import { ProductionOrderList } from "@/src/features/production-orders/components/ProductionOrderList";

export const metadata: Metadata = {
  title: "Órdenes de Producción | Producción | ERP",
};

// Página de Órdenes de Producción — módulo de manufactura
export default function ProductionOrdersPage() {
  return <ProductionOrderList />;
}
