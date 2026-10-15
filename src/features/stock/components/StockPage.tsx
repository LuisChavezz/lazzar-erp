import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { StockView } from "./StockView";

/**
 * Contenido de página de Existencias, compartido por cada ruta que la expone
 * (WMS, Compras y SCM, Producción) sin bifurcar la feature: todas comparten
 * las queryKeys (mismo caché).
 *
 * El contenedor de altura acotada es el que `StockView` llena con
 * `fillHeight`; vive aquí para que todas las rutas rendericen igual.
 */
export function StockPage() {
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
