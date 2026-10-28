import type { Metadata } from "next";
import { ProductionProductsView } from "@/src/features/products/components/ProductionProductsView";

export const metadata: Metadata = {
  title: "Productos | Producción | ERP",
};

// Página de Productos — módulo de manufactura (listado + alta rápida)
export default function ManufacturingProductsPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <ProductionProductsView />
    </div>
  );
}
