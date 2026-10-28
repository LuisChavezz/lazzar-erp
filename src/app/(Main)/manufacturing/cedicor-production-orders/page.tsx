import type { Metadata } from "next";
import { CedicorProductionOrderList } from "@/src/features/cedicor/components/CedicorProductionOrderList";

export const metadata: Metadata = {
  title: "Órdenes de Producción Cedicor | Producción | ERP",
};

// Página de Órdenes de Producción Cedicor — módulo de manufactura
export default function CedicorProductionOrdersPage() {
  return <CedicorProductionOrderList />;
}
