"use client";

import { PackingIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { usePackingDetail } from "../hooks/usePackingDetail";
import { PackingDetailContent, PackingHeaderActions } from "./PackingDetailDialog";

interface PackingDetailByIdDialogProps {
  /** Id del packing a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Envoltorio self-fetching de `PackingDetailDialog`. El diálogo original recibe
 * el `Packing` ya cargado (no lo trae él), no acepta `null` y no tiene estados
 * de carga/error. Este wrapper cierra esas brechas SIN tocar su API pública,
 * para exponer la firma por id (`{ orderId, open, onOpenChange }`) que exige el
 * registro `CLICKABLE_DOC_TIPOS` del detalle de pedido:
 *  1. trae el `Packing` por id (`usePackingDetail`);
 *  2. renderiza un ÚNICO `MainDialog` que solo intercambia su contenido
 *     (loader → error → `PackingDetailContent`): al mantener el mismo shell
 *     montado, la transición carga→dato NO remonta el modal (sin parpadeo de
 *     cierre/apertura ni reset de foco). Mismo chrome que `PackingDetailDialog`
 *     (PackingIcon, `maxWidth="820px"`, "Detalle de Packing").
 *
 * A diferencia del wrapper de picking, aquí NO hay enriquecimiento: el contenido
 * consume el `Packing` crudo. No depende de la query del listado (`usePackings`).
 */
export function PackingDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
}: PackingDetailByIdDialogProps) {
  const { packing, isLoading, isNotFound, error } = usePackingDetail(orderId);

  // Sin id válido la consulta queda apagada (`usePackingDetail`): ni carga ni error.
  const hasId = orderId !== null && orderId > 0;

  // Un refetch fallido CONSERVA `packing` (solo toast, `useGuardedQuery`): el
  // cuerpo y sus acciones siguen montados; sin datos se muestra el error.
  const subtitle = packing ? packing.folio : !hasId ? "" : isLoading ? "Cargando…" : "Error al cargar";

  // "Descargar PDF" (EC-858) y "Cancelar" (EC-945) junto al título, una vez
  // cargado el embarque. Nada accionable mientras carga o falla sin datos.
  const pdfAction = packing ? <PackingHeaderActions packing={packing} /> : null;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={true}
      headerAction={pdfAction}
      title={
        // Con acción, el encabezado de `MainDialog` ya reserva el espacio de la X.
        <div className={`flex items-center gap-2.5 ${pdfAction ? "" : "pr-8"}`}>
          <PackingIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Embarque
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
      }
    >
      {packing ? (
        <PackingDetailContent packing={packing} />
      ) : !hasId ? null : isLoading ? (
        <Loader title="Cargando detalle del embarque..." className="py-16" />
      ) : (
        // 404 definitivo (no existe o fuera de alcance: el backend fusiona ambos)
        // o carga inicial fallida sin datos en caché.
        <ErrorState
          title="No se pudo cargar el embarque"
          message={
            isNotFound
              ? "No existe o no tienes acceso a él."
              : extractErrorMessage(error, "No existe, no tienes acceso a él o falló la conexión.")
          }
        />
      )}
    </MainDialog>
  );
}
