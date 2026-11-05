import type { Metadata } from "next";
import { CedicorNewDevelopmentList } from "@/src/features/cedicor/components/CedicorNewDevelopmentList";
import { MOCK_CEDICOR_NEW_DEVELOPMENT } from "@/src/features/cedicor/mocks/cedicor-new-development.mock";

export const metadata: Metadata = {
  title: "Nuevo Desarrollo Cedicor | Producción | ERP",
};

// Página de Órdenes de Nuevo Desarrollo Cedicor — módulo de manufactura
export default function CedicorProductDevelopmentOrdersPage() {
  return <CedicorNewDevelopmentList data={MOCK_CEDICOR_NEW_DEVELOPMENT} />;
}
