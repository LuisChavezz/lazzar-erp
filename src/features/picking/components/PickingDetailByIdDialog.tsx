"use client";

import { RouteIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { usePickingDetail } from "../hooks/usePickingDetail";
import { mapPickingToRow } from "../utils/picking.utils";
import { PickingDetailContent } from "./PickingDetailContent";
import { PickingPdfButton } from "./PickingPdfButton";

interface PickingDetailByIdDialogProps {
  /** Id del picking a consultar. `null` mantiene la consulta apagada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Detalle de un surtido POR ID, el único diálogo de detalle de picking: lo
 * abren el listado de picking (cuyas filas, de `?resumen=1`, no traen
 * renglones), el detalle de pedido (registro `CLICKABLE_DOC_TIPOS`) y la
 * auditoría documental, con la firma `{ orderId, open, onOpenChange }`:
 *  1. trae el `Picking` completo por id (`usePickingDetail`);
 *  2. lo enriquece a `PickingRow` con `mapPickingToRow(picking, dataUpdatedAt)`
 *     (`esta_vencida`);
 *  3. renderiza un ÚNICO `MainDialog` que solo intercambia su contenido
 *     (loader → error → `PickingDetailContent`): al mantener el mismo shell
 *     montado, la transición carga→dato NO remonta el modal (sin parpadeo de
 *     cierre/apertura ni reset de foco).
 *
 * No depende de la consulta del listado: fetchea por id.
 */
export function PickingDetailByIdDialog({
  orderId,
  open,
  onOpenChange,
}: PickingDetailByIdDialogProps) {
  const { picking, fetchedAt, isLoading, isNotFound, error } = usePickingDetail(orderId);

  // `fetchedAt` como "ahora": fijado al leer, no en render (ver `usePickingDetail`).
  // Un refetch fallido CONSERVA `picking` (solo toast), así que el cuerpo —y un
  // traslado abierto con su aviso— sigue montado; sin datos se muestra el error.
  const row = picking ? mapPickingToRow(picking, fetchedAt) : null;

  const subtitle = row ? row.folio : isLoading ? "Cargando…" : "Error al cargar";

  // "Descargar PDF" junto al título (EC-858), una vez cargado el surtido.
  const pdfAction = row ? <PickingPdfButton picking={row} /> : null;

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
          <RouteIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Surtido
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
      }
    >
      {row ? (
        <PickingDetailContent picking={row} />
      ) : isLoading ? (
        <Loader title="Cargando detalle del surtido..." className="py-16" />
      ) : (
        // 404 definitivo (no existe o fuera de alcance: el backend fusiona ambos)
        // o carga inicial fallida sin datos en caché.
        <ErrorState
          title="No se pudo cargar el surtido"
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
