"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import { useDeleteSeguimiento } from "../hooks/useSeguimientoMutations";
import type { OpportunitySeguimiento } from "../interfaces/seguimiento.interface";
import { previewText } from "../utils/seguimientos";

const DETALLE_PREVIEW_LENGTH = 60;

/**
 * Cuál es el seguimiento, para que se sepa qué se va a borrar: su tipo y el
 * inicio de su detalle (`previewText`).
 */
const describeSeguimiento = (seguimiento: OpportunitySeguimiento): string => {
  const preview = previewText(seguimiento.detalle, DETALLE_PREVIEW_LENGTH);
  return preview ? `${seguimiento.tipo}: "${preview}"` : seguimiento.tipo;
};

interface OpportunitySeguimientoDeleteDialogProps {
  /** Seguimiento por eliminar; `null` = cerrado. */
  seguimiento: OpportunitySeguimiento | null;
  /** Cierra el diálogo (quien lo monta pone `seguimiento` en `null`). */
  onClose: () => void;
}

/**
 * Confirmación de "Eliminar" un seguimiento. El borrado es FÍSICO —no una baja
 * lógica como la de la oportunidad—, y el texto lo dice, nombrando el
 * seguimiento (`describeSeguimiento`).
 *
 * Queda abierta y bloqueada (`busy`) hasta que el servidor responde y el
 * historial se relee; entonces se cierra, con éxito o con error (el aviso lo da
 * el hook: si otra persona ya lo había eliminado, "ya no existe"). Siempre
 * montada y abierta por `seguimiento`, como `OpportunityDeleteDialog`: así se
 * cierra con su animación aunque el detalle de detrás cambie de estado.
 */
export function OpportunitySeguimientoDeleteDialog({
  seguimiento,
  onClose,
}: OpportunitySeguimientoDeleteDialogProps) {
  const { mutate: deleteSeguimiento } = useDeleteSeguimiento();
  // Candado SÍNCRONO por seguimiento, tomado al confirmar: un doble clic manda
  // un solo DELETE y la confirmación no se cierra mientras viaja.
  const lock = useRowActionLock();
  const seguimientoId = seguimiento?.id ?? null;
  const isDeleting = lock.isPending(seguimientoId);

  // El texto sigue nombrando al último seguimiento mientras el diálogo se
  // cierra, cuando `seguimiento` ya es `null`.
  const shown = useDialogSession(seguimiento !== null, seguimiento).snapshot;

  return (
    <ConfirmDialog
      open={seguimiento !== null}
      {...lock.guardClose(seguimientoId, onClose)}
      title="Eliminar Seguimiento"
      description={`Se eliminará definitivamente este seguimiento${
        shown ? ` (${describeSeguimiento(shown)})` : ""
      }. Esta acción no se puede deshacer.`}
      confirmText={isDeleting ? "Eliminando…" : "Eliminar"}
      confirmColor="red"
      closeOnConfirm={false}
      onConfirm={() => {
        if (!seguimiento || !lock.acquire(seguimiento.id)) return;
        const { id } = seguimiento;
        deleteSeguimiento(id, {
          onSettled: () => {
            lock.release(id);
            onClose();
          },
        });
      }}
    />
  );
}
