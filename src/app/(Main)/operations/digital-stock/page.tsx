import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@/src/components/Loader";
import { DigitalStockList } from "@/src/features/digital-stock/components/DigitalStockList";

export const metadata: Metadata = {
  title: "Stock digital | Mesa de Control | ERP",
  description:
    "Por SKU: existencia en ALM-00, lo comprometido en pedidos y lo que viene de producción y compras.",
};

export default function OperationsDigitalStockPage() {
  return (
    <div className="w-full">
      {/* `DigitalStockList` lee filtros, búsqueda y página de la URL con
          `useSearchParams`, que en Next.js requiere un límite de Suspense. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando stock digital..." />}>
        <DigitalStockList module="operations" />
      </Suspense>
    </div>
  );
}
