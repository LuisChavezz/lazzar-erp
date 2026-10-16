"use client";

import { useIsMutating } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { FormCancelButton, FormSecondaryButton } from "@/src/components/FormButtons";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { hasPermission } from "@/src/utils/permissions";
import { isPurchaseOrderCancelled } from "../constants/purchaseOrderStatus";
import {
  isValidPurchaseOrderId,
  usePurchaseOrderCriticalPath,
} from "../hooks/usePurchaseOrderCriticalPath";
import {
  PURCHASE_ORDER_CRITICAL_PATH_NOT_FOUND_MESSAGE,
  updatePurchaseOrderCriticalPathMutationKey,
} from "../hooks/useUpdatePurchaseOrderCriticalPath";
import type { PurchaseOrderCriticalPathTarget } from "../interfaces/purchase-order-critical-path.interface";
import { PurchaseOrderCriticalPathForm } from "./PurchaseOrderCriticalPathForm";

interface PurchaseOrderCriticalPathDialogProps {
  /** OC abierta. Folio y estatus vienen de quien abre: la respuesta no los trae. */
  target: PurchaseOrderCriticalPathTarget;
  onClose: () => void;
}

const CANCELLED_NOTICE =
  "La orden de compra está cancelada: su ruta crítica solo se puede consultar.";
const NO_PERMISSION_NOTICE =
  "No tienes permiso para editar la ruta crítica de órdenes de compra: solo se puede consultar.";

/**
 * Diálogo de la ruta crítica de UNA OC (EC-488). Lo abren el listado (acción
 * de fila) y la página de detalle (botón); ambos lo montan SOLO mientras está
 * abierto, con `key` por OC, y la consulta usa `gcTime: 0`: cada apertura
 * espera una lectura fresca antes de montar el formulario.
 *
 * Ciclo de vida copiado del diálogo de la OP
 * (`ProductionOrderCriticalPathDialog`): el formulario se monta con `key` =
 * `updated_at`, así que al guardar (la mutación escribe en caché el registro
 * devuelto) se vuelve a montar con lo recién guardado como base; y el diálogo
 * no se cierra a media petición. Sin su 409 ni su modo "orden cerrada": el
 * backend de la OC acepta la captura en todos los estatus.
 *
 * Solo lectura —decisión de negocio, aplicada aquí en el cliente— cuando la
 * OC está Cancelada o el usuario no tiene `E-COMPRAS-OC`. El backend hoy solo
 * exige sesión para escribir (DISTinTheHouse/nucleo-erp#526), así que esto es UX,
 * no una frontera de seguridad. El estatus es la FOTO que tomó quien abre.
 */
export function PurchaseOrderCriticalPathDialog({
  target,
  onClose,
}: PurchaseOrderCriticalPathDialogProps) {
  const validId = isValidPurchaseOrderId(target.ocId);
  const { data: session } = useSession();
  const canEdit = hasPermission("E-COMPRAS-OC", session?.user);
  const readOnlyNotice = isPurchaseOrderCancelled(target.estatus)
    ? CANCELLED_NOTICE
    : canEdit
      ? null
      : NO_PERMISSION_NOTICE;

  const { data, error, isInitialError, isDefinitiveError, isFetching, refetch } =
    usePurchaseOrderCriticalPath(target.ocId);
  const isSaving =
    useIsMutating({ mutationKey: updatePurchaseOrderCriticalPathMutationKey(target.ocId) }) > 0;

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado (éxito o error) debe verse.
    if (!next && !isSaving) onClose();
  };

  const renderBody = () => {
    if (!validId || isDefinitiveError || isInitialError) {
      const notFound = !validId || isDefinitiveError;
      return (
        <div className="space-y-4">
          <ErrorState
            title={
              notFound ? "Orden de compra no encontrada" : "No se pudo cargar la ruta crítica"
            }
            message={
              notFound
                ? PURCHASE_ORDER_CRITICAL_PATH_NOT_FOUND_MESSAGE
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

    if (!data) {
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
        {/* Sin captura todavía (`updated_at: null`) no se muestra nada. */}
        {data.updated_at && (
          <p className="mb-4 ml-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Última actualización: {formatShortDateTime(data.updated_at)}
          </p>
        )}
        <PurchaseOrderCriticalPathForm
          key={data.updated_at ?? "sin-captura"}
          ocId={target.ocId}
          data={data}
          readOnlyNotice={readOnlyNotice}
          onClose={() => handleOpenChange(false)}
        />
      </>
    );
  };

  return (
    <MainDialog
      open
      onOpenChange={handleOpenChange}
      maxWidth="560px"
      showCloseButton={false}
      title={`Ruta crítica · ${target.folio || `Orden #${target.ocId}`}`}
      description="Seguimiento informativo: no modifica la orden, sus recepciones ni el inventario."
    >
      {renderBody()}
    </MainDialog>
  );
}
