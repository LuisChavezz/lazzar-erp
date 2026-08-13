"use client";

import { RouteIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { usePickingDetail } from "../hooks/usePickingDetail";
import { mapPickingToRow } from "../utils/picking.utils";
import { PickingDetailContent } from "./PickingDetailDialog";

interface PickingDetailByIdDialogProps {
  /** Id del picking a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Envoltorio self-fetching de `PickingDetailDialog`. El diálogo original recibe
 * la fila YA ENRIQUECIDA (`PickingRow` = `Picking` + `esta_vencida`), no la trae
 * él, no acepta `null` y no tiene estados de carga/error. Este wrapper cierra
 * todas esas brechas SIN tocar su API pública, para exponer la firma por id
 * (`{ orderId, open, onOpenChange }`) que exige el registro `CLICKABLE_DOC_TIPOS`
 * del detalle de pedido:
 *  1. trae el `Picking` crudo por id (`usePickingDetail`);
 *  2. lo enriquece a `PickingRow` con `mapPickingToRow(picking, dataUpdatedAt)`
 *     —el MISMO helper del listado, así el "vencido" no diverge—;
 *  3. renderiza un ÚNICO `MainDialog` que solo intercambia su contenido
 *     (loader → error → `PickingDetailContent`): al mantener el mismo shell
 *     montado, la transición carga→dato NO remonta el modal (sin parpadeo de
 *     cierre/apertura ni reset de foco). Mismo chrome que `PickingDetailDialog`
 *     (RouteIcon, `maxWidth="820px"`, "Detalle de Picking").
 *
 * No depende de la query del listado (`usePickings`): fetchea por id.
 */
export function PickingDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
}: PickingDetailByIdDialogProps) {
  const { picking, dataUpdatedAt, isLoading, isError, error } =
    usePickingDetail(orderId);

  // `dataUpdatedAt` como "ahora": misma fuente de vencimiento que el listado.
  const row = picking ? mapPickingToRow(picking, dataUpdatedAt) : null;

  const subtitle = isLoading
    ? "Cargando…"
    : isError || !row
      ? "Error al cargar"
      : row.folio;

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="820px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <RouteIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Picking
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <Loader title="Cargando detalle del picking..." className="py-16" />
      ) : isError || !row ? (
        // Error de red o consulta resuelta sin registro (404 fuera de tenant / id
        // inexistente): el backend fusiona ambos en un 404, un solo estado basta.
        <ErrorState
          title="No se pudo cargar el picking"
          message={extractErrorMessage(
            error,
            "No existe, no tienes acceso a él o falló la conexión.",
          )}
        />
      ) : (
        <PickingDetailContent picking={row} />
      )}
    </MainDialog>
  );
}
