"use client";

import { PackingIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { usePackingDetail } from "../hooks/usePackingDetail";
import { PackingDetailContent } from "./PackingDetailDialog";

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
  const { data: packing, isLoading, isError, error } = usePackingDetail(orderId);

  const subtitle = isLoading
    ? "Cargando…"
    : isError || !packing
      ? "Error al cargar"
      : packing.folio;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <PackingIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Packing
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <Loader title="Cargando detalle del packing..." className="py-16" />
      ) : isError || !packing ? (
        // Error de red o consulta resuelta sin registro (404 fuera de tenant / id
        // inexistente): el backend fusiona ambos en un 404, un solo estado basta.
        <ErrorState
          title="No se pudo cargar el packing"
          message={extractErrorMessage(
            error,
            "No existe, no tienes acceso a él o falló la conexión.",
          )}
        />
      ) : (
        <PackingDetailContent packing={packing} />
      )}
    </MainDialog>
  );
}
