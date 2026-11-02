import type { ReactNode } from "react";
import { LoadingSkeleton } from "./LoadingSkeleton";

interface ProcurementRouteSkeletonProps {
  /**
   * - `detail`: página de detalle (enlace "Volver", encabezado y secciones).
   * - `dashboard`: panel de compras (tarjetas y paneles).
   */
  variant: "detail" | "dashboard";
  /**
   * Solo `detail`: el "Volver" real, cuando quien pinta el skeleton ya lo
   * tiene (la página mientras carga sus datos). Sin él se reserva su hueco.
   */
  backLink?: ReactNode;
}

/**
 * Estado de carga ÚNICO de las páginas de detalle y del panel de Compras
 * (EC-695). Lo pinta su `loading.tsx` mientras llega la ruta y, con el MISMO
 * marcado, la propia página mientras espera sus datos, así que la navegación
 * pasa del skeleton al contenido sin un spinner intermedio. Las listas no lo
 * usan: su `DataTable` ya mantiene el toolbar montado con el cuerpo en
 * skeleton, y Next deja visible la página anterior mientras llega la nueva.
 *
 * Vive en `src/components` y no junto a las rutas porque también lo importan
 * los componentes de feature de esas páginas.
 */
export function ProcurementRouteSkeleton({ variant, backLink }: ProcurementRouteSkeletonProps) {
  if (variant === "dashboard") {
    // Mismo contenedor que `ProcurementDashboardPage` y misma rejilla que
    // `PurchaseOrderDashboard`: cuatro tarjetas y dos paneles.
    return (
      <div className="px-1 pb-8" role="status" aria-label="Cargando panel de compras">
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <LoadingSkeleton key={index} className="h-28" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <LoadingSkeleton className="h-96" />
            <LoadingSkeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6" role="status" aria-label="Cargando detalle">
      {backLink ?? (
        // `w-56!`: `LoadingSkeleton` ya trae `w-full` y no hay tailwind-merge.
        <LoadingSkeleton className="h-9 w-56! rounded-full" />
      )}
      <LoadingSkeleton className="h-32 rounded-2xl" />
      <LoadingSkeleton className="h-64 rounded-2xl" />
      <LoadingSkeleton className="h-64 rounded-2xl" />
    </div>
  );
}
