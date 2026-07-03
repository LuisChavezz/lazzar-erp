import { Suspense } from "react";
import { StockView } from "@/src/features/stock/components/StockView";

// `StockView` lee el filtro de almacén desde la URL con `useSearchParams`, que
// en Next.js requiere un límite de Suspense en el árbol superior.
function StockViewFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      <span className="ml-3 text-sm text-slate-500">Cargando existencias...</span>
    </div>
  );
}

export default function StockPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestión centralizada de stock y materias primas.
        </p>
      </div>

      <Suspense fallback={<StockViewFallback />}>
        <StockView />
      </Suspense>
    </div>
  );
}
