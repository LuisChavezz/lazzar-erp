import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { StockView } from "@/src/features/stock/components/StockView";

export default function StockPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestión centralizada de stock y materias primas.
        </p>
      </div>

      {/* `StockView` lee el filtro de almacén desde la URL con `useSearchParams`,
          que en Next.js requiere un límite de Suspense en el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando existencias..." />}>
        <StockView />
      </Suspense>
    </div>
  );
}
