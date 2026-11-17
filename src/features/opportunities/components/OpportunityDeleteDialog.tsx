"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import { useDeleteOpportunity } from "../hooks/useDeleteOpportunity";
import type { Opportunity } from "../interfaces/opportunity.interface";
import { describeOpportunity } from "../utils/describeOpportunity";

interface OpportunityDeleteDialogProps {
  /** Oportunidad por dar de baja; `null` = cerrado. */
  opportunity: Opportunity | null;
  /** Cierra el diálogo (quien lo monta pone `opportunity` en `null`). */
  onClose: () => void;
  /** Ver `useDeleteOpportunity`: se llama con la baja confirmada, antes de tocar la caché. */
  onDeleted?: (id: number) => void;
}

/**
 * Confirmación de "Dar de baja", la misma en el listado y en el detalle.
 *
 * Sin optimista: queda abierta y bloqueada (`busy`) hasta que el servidor
 * responde y lo que haya que releer se relee; entonces se cierra, con éxito o
 * con error (el aviso lo da el hook).
 *
 * Recibe el REGISTRO, no su id: en modo servidor la tabla solo tiene una
 * página, y la fila puede salir de la vista con el diálogo abierto. Queda
 * SIEMPRE montada y se abre con `opportunity`: así se cierra con su animación
 * aunque la pantalla de detrás cambie (el detalle pasa a "no disponible" o a
 * "volviendo al listado").
 *
 * - Candado SÍNCRONO por oportunidad (`useRowActionLock`): se toma al
 *   confirmar, así un doble clic manda una sola baja; el diálogo no se cierra
 *   mientras viaja.
 */
export function OpportunityDeleteDialog({
  opportunity,
  onClose,
  onDeleted,
}: OpportunityDeleteDialogProps) {
  const { mutate: deleteOpportunity } = useDeleteOpportunity({ onDeleted });
  const lock = useRowActionLock();
  const opportunityId = opportunity?.id ?? null;
  const isDeleting = lock.isPending(opportunityId);

  // El texto sigue nombrando a la última oportunidad mientras el diálogo se
  // cierra, cuando `opportunity` ya es `null`.
  const shown = useDialogSession(opportunity !== null, opportunity).snapshot;

  return (
    <ConfirmDialog
      open={opportunity !== null}
      {...lock.guardClose(opportunityId, onClose)}
      title="Dar de Baja Oportunidad"
      description={
        shown
          ? `¿Dar de baja la oportunidad ${describeOpportunity(
              shown
            )}? Dejará de aparecer en el listado y en el seguimiento comercial.`
          : ""
      }
      confirmText={isDeleting ? "Dando de baja…" : "Dar de baja"}
      confirmColor="red"
      closeOnConfirm={false}
      onConfirm={() => {
        if (!opportunity || !lock.acquire(opportunity.id)) return;
        const { id } = opportunity;
        deleteOpportunity(id, {
          onSettled: () => {
            lock.release(id);
            onClose();
          },
        });
      }}
    />
  );
}
