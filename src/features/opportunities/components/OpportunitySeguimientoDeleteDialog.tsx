"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDeleteSeguimiento } from "../hooks/useSeguimientoMutations";
import type { OpportunitySeguimiento } from "../interfaces/seguimiento.interface";

interface OpportunitySeguimientoDeleteDialogProps {
  /** Seguimiento por eliminar; `null` = cerrado. */
  seguimiento: OpportunitySeguimiento | null;
  /** Cierra el diálogo (quien lo monta pone `seguimiento` en `null`). */
  onClose: () => void;
}

/**
 * Confirmación de "Eliminar" un seguimiento. El borrado es FÍSICO —no una baja
 * lógica como la de la oportunidad—, y el texto lo dice.
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
  const { mutate: deleteSeguimiento, isPending: isDeleting } = useDeleteSeguimiento();

  return (
    <ConfirmDialog
      open={seguimiento !== null}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose();
      }}
      title="Eliminar Seguimiento"
      description="Se eliminará definitivamente este seguimiento. Esta acción no se puede deshacer."
      confirmText={isDeleting ? "Eliminando…" : "Eliminar"}
      confirmColor="red"
      closeOnConfirm={false}
      busy={isDeleting}
      onConfirm={() => {
        if (seguimiento) deleteSeguimiento(seguimiento.id, { onSettled: onClose });
      }}
    />
  );
}
