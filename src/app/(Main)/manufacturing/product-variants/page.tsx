import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { ProductionVariantsView } from "@/src/features/product-variants/components/ProductionVariantsView";

export const metadata: Metadata = {
  title: "Variantes de Producto | Producción | ERP",
};

// Página de Variantes — módulo de manufactura (listado + alta rápida)
export default function ManufacturingProductVariantsPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      {/* La tabla lee filtros, búsqueda, orden y página de la URL con
          `useSearchParams` (modo servidor, EC-897), que en Next.js requiere un
          límite de Suspense. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando variantes..." />}>
        <ProductionVariantsView />
      </Suspense>
    </div>
  );
}
