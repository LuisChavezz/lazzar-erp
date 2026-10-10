"use client";

import { useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { FormCancelButton, FormSecondaryButton } from "@/src/components/FormButtons";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { isClosedProductionOrderStatus } from "@/src/features/production-orders/constants/productionOrderStatus";
import { closedOpNotice } from "../constants/criticalPathChoices";
import { CRITICAL_PATH_NOT_FOUND_MESSAGE } from "../hooks/criticalPathErrorMessages";
import {
  isValidOpId,
  useProductionOrderCriticalPath,
} from "../hooks/useProductionOrderCriticalPath";
import { updateCriticalPathMutationKey } from "../hooks/useUpdateProductionOrderCriticalPath";
import type { CriticalPathTarget } from "../interfaces/production-order-critical-path.interface";
import { formatCriticalPathDateTime } from "../utils/criticalPathFormat";
import { CriticalPathForm } from "./CriticalPathForm";

interface ProductionOrderCriticalPathDialogProps {
  /** OP abierta. Folio y estatus vienen de quien abre: la respuesta no los trae. */
  target: CriticalPathTarget;
  onClose: () => void;
}

/**
 * Diálogo de la ruta crítica de UNA OP. Lo abren el listado (acción de fila) y
 * la página de detalle (botón); ambos lo montan SOLO mientras está abierto,
 * con `key` por OP, porque cada apertura debe esperar una lectura fresca
 * (`isFetchedAfterMount`) antes de montar el formulario.
 *
 * El formulario se monta con `key` = el `updated_at` que tomó como base
 * (`formKey`), y se vuelve a montar —con valores frescos— cuando:
 * - la persona guarda (`onSaved`): lo recién guardado es la nueva base, el
 *   botón de guardar vuelve a deshabilitarse y los sellos se actualizan;
 * - llega un registro más nuevo (otra persona guardó) y NO hay captura sin
 *   guardar.
 * Con captura sin guardar, un registro más nuevo NO remonta: lo capturado se
 * conserva, se avisa con una nota, y al guardar solo viajan los campos que
 * esta persona cambió (los que cambió la otra no se pisan).
 *
 * Una OP Completada o Cancelada se abre en SOLO LECTURA (aviso + formulario
 * deshabilitado y sin guardar): el backend rechaza su PATCH con 409. El estatus
 * es la FOTO que tomó quien abre; si era viejo o la OP se cierra con el diálogo
 * ya abierto, el 409 llega al guardar: su `msg` se muestra en el toast y el
 * diálogo pasa a solo lectura hasta cerrarse (`closedByServer`), con un aviso
 * que no afirma cuál de los dos estatus es.
 *
 * Un refetch fallido tras una carga correcta no reemplaza el formulario: avisa
 * por toast (`isInitialError`). Un id que no es entero positivo se trata como
 * OP no encontrada sin pedir nada.
 */
export function ProductionOrderCriticalPathDialog({
  target,
  onClose,
}: ProductionOrderCriticalPathDialogProps) {
  const validId = isValidOpId(target.opId);
  // El PATCH respondió 409 en esta apertura: manda sobre el estatus de la foto.
  const [closedByServer, setClosedByServer] = useState(false);
  const readOnlyNotice = closedByServer
    ? closedOpNotice()
    : isClosedProductionOrderStatus(target.estatusOp)
      ? closedOpNotice(target.estatusOp)
      : null;
  const { data, error, isInitialError, isFetchedAfterMount, isFetching, refetch } =
    useProductionOrderCriticalPath(target.opId);
  const isSaving = useIsMutating({ mutationKey: updateCriticalPathMutationKey }) > 0;

  // `updated_at` que el formulario montado tomó como base, y si tiene captura
  // sin guardar (lo informa el propio formulario).
  const [formKey, setFormKey] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const isReady = Boolean(data) && isFetchedAfterMount;

  // Ajuste en RENDER, no en un efecto: sin captura pendiente, la base sigue al
  // registro vigente (primera carga, o uno más nuevo que guardó otra persona).
  if (isReady && data && !isDirty && formKey !== data.updated_at) {
    setFormKey(data.updated_at);
  }
  const hasNewerRecord = isReady && data !== undefined && formKey !== null && formKey !== data.updated_at;

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && !isSaving) onClose();
  };

  const renderBody = () => {
    if (!validId || isInitialError) {
      const notFound = !validId || isNotFoundError(error);
      return (
        <div className="space-y-4">
          <ErrorState
            title={
              notFound
                ? "Orden de producción no encontrada"
                : "No se pudo cargar la ruta crítica"
            }
            message={
              notFound
                ? CRITICAL_PATH_NOT_FOUND_MESSAGE
                : (firstDrfFieldMessage(error) ??
                  "Falló la conexión con el servidor. Intenta de nuevo.")
            }
          />
          <div className="flex justify-end gap-3">
            {!notFound && (
              <FormSecondaryButton
                label={isFetching ? "Reintentando…" : "Reintentar"}
                disabled={isFetching}
                onClick={() => void refetch()}
              />
            )}
            <FormCancelButton label="Cerrar" onClick={onClose} />
          </div>
        </div>
      );
    }

    if (!data || !isReady) {
      return (
        <div className="space-y-4">
          <Loader
            className="py-10"
            title="Cargando ruta crítica"
            message="Obteniendo la captura de la orden..."
          />
          <div className="flex justify-end">
            <FormCancelButton label="Cerrar" onClick={onClose} />
          </div>
        </div>
      );
    }

    return (
      <>
        <p className="mb-4 ml-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          Última actualización: {formatCriticalPathDateTime(data.updated_at)}
        </p>
        {hasNewerRecord && !isSaving && (
          <p className="mb-4 ml-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            Otra persona guardó cambios mientras editabas. Tu captura se conserva y
            al guardar solo se envían los campos que tú cambiaste; cierra y vuelve a
            abrir para ver los valores nuevos.
          </p>
        )}
        <CriticalPathForm
          key={formKey ?? data.updated_at}
          opId={target.opId}
          data={data}
          readOnlyNotice={readOnlyNotice}
          onClose={() => handleOpenChange(false)}
          onDirtyChange={setIsDirty}
          onSaved={setFormKey}
          onOpClosed={() => setClosedByServer(true)}
        />
      </>
    );
  };

  return (
    <MainDialog
      open
      onOpenChange={handleOpenChange}
      maxWidth="760px"
      showCloseButton={false}
      title={`Ruta crítica · ${target.folio || `OP #${target.opId}`}`}
      description="Seguimiento por subproceso de la orden de producción."
    >
      {renderBody()}
    </MainDialog>
  );
}
