import { ProductionVariantsView } from "@/src/features/product-variants/components/ProductionVariantsView";

// Página de Variantes — módulo de manufactura (listado + alta rápida)
export default function ManufacturingProductVariantsPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      <ProductionVariantsView />
    </div>
  );
}
