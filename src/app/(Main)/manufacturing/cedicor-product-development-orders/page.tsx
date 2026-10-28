import type { Metadata } from "next";
import { CedicorNewDevelopmentList } from "@/src/features/cedicor/components/CedicorNewDevelopmentList";

export const metadata: Metadata = {
  title: "Nuevo Desarrollo Cedicor | Producción | ERP",
};

// Página de Órdenes de Nuevo Desarrollo Cedicor — módulo de manufactura
export default function CedicorProductDevelopmentOrdersPage() {
  return <CedicorNewDevelopmentList />;
}
