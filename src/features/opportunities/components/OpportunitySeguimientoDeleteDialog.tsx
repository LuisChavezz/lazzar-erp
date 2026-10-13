"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDeleteSeguimiento } from "../hooks/useSeguimientoMutations";
import type { OpportunitySeguimiento } from "../interfaces/seguimiento.interface";

const DETALLE_PREVIEW_LENGTH = 60;

/**
 * Cuál es el seguimiento, para que se sepa qué se va a borrar: su tipo y el
 * inicio de su detalle, en un solo renglón (los saltos de línea se aplanan).
 */
const describeSeguimiento = (seguimiento: OpportunitySeguimiento): string => {
  const detalle = seguimiento.detalle.replace(/\s+/g, " ").trim();
  if (!detalle) return seguimiento.tipo;
  const preview =
    detalle.length > DETALLE_PREVIEW_LENGTH
      ? `${detalle.slice(0, DETALLE_PREVIEW_LENGTH).trimEnd()}…`
      : detalle;
  return `${seguimiento.tipo}: "${preview}"`;
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
  const { mutate: deleteSeguimiento, isPending: isDeleting } = useDeleteSeguimiento();

  // El texto sigue nombrando al último seguimiento mientras el diálogo se
  // cierra, cuando `seguimiento` ya es `null`.
  const [shown, setShown] = useState(seguimiento);
  if (seguimiento !== null && seguimiento !== shown) setShown(seguimiento);

  return (
    <ConfirmDialog
      open={seguimiento !== null}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose();
      }}
      title="Eliminar Seguimiento"
      description={`Se eliminará definitivamente este seguimiento${
        shown ? ` (${describeSeguimiento(shown)})` : ""
      }. Esta acción no se puede deshacer.`}
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
