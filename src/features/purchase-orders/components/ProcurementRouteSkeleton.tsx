import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { KpiGridSkeleton } from "@/src/components/KpiGrid";

interface ProcurementRouteSkeletonProps {
  /**
   * - `list`: tabla de un listado, opcionalmente con su fila de indicadores.
   * - `detail`: página de detalle (enlace "Volver", encabezado y secciones).
   * - `dashboard`: panel de compras (accesos, tarjetas y paneles).
   */
  variant: "list" | "detail" | "dashboard";
  /** Solo `list`: reserva la fila de indicadores compactos que va arriba. */
  withKpis?: boolean;
}

/**
 * Esqueleto de los `loading.tsx` de Compras (EC-695). Next lo pinta en cuanto
 * se pulsa un enlace —y, con un `loading.tsx`, la ruta dinámica se prefetchea
 * hasta él—, en lugar de dejar la pantalla anterior congelada mientras llega
 * la nueva. Imita la silueta de cada pantalla con los mismos bloques que usan
 * ya sus estados de carga (`KpiGridSkeleton` compacto de las secciones de
 * indicadores, el `LoadingSkeleton` del cuerpo de `DataTable`) para que el
 * cambio al estado de carga propio de la página no salte.
 */
export function ProcurementRouteSkeleton({ variant, withKpis = false }: ProcurementRouteSkeletonProps) {
  if (variant === "detail") {
    return (
      <div className="w-full space-y-6 pt-2" role="status" aria-label="Cargando detalle">
        {/* `w-40!`: `LoadingSkeleton` ya trae `w-full` y no hay tailwind-merge. */}
        <LoadingSkeleton className="h-5 w-40! rounded-full" />
        <LoadingSkeleton className="h-32 rounded-2xl" />
        <LoadingSkeleton className="h-64 rounded-2xl" />
        <LoadingSkeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className="px-1 pb-8 space-y-4 sm:space-y-6" role="status" aria-label="Cargando panel de compras">
        <LoadingSkeleton className="h-14 rounded-xl" />
        <KpiGridSkeleton count={4} />
        <LoadingSkeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6" role="status" aria-label="Cargando">
      {withKpis && <KpiGridSkeleton compact count={4} />}
      <LoadingSkeleton className="h-120 rounded-2xl" />
    </div>
  );
}
