import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { StockView } from "@/src/features/stock/components/StockView";

export default function StockPage() {
  return (
    <div className="w-full h-[calc(100dvh-13rem)] min-h-0">
      {/* `StockView` lee el filtro de almacén desde la URL con `useSearchParams`,
          que en Next.js requiere un límite de Suspense en el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando existencias..." />}>
        <StockView />
      </Suspense>
    </div>
  );
}
