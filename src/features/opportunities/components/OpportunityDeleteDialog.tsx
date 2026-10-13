"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
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
 */
export function OpportunityDeleteDialog({
  opportunity,
  onClose,
  onDeleted,
}: OpportunityDeleteDialogProps) {
  const { mutate: deleteOpportunity, isPending: isDeleting } = useDeleteOpportunity({ onDeleted });

  // El texto sigue nombrando a la última oportunidad mientras el diálogo se
  // cierra, cuando `opportunity` ya es `null`.
  const [shown, setShown] = useState(opportunity);
  if (opportunity !== null && opportunity !== shown) setShown(opportunity);

  return (
    <ConfirmDialog
      open={opportunity !== null}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose();
      }}
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
      busy={isDeleting}
      onConfirm={() => {
        if (opportunity) deleteOpportunity(opportunity.id, { onSettled: onClose });
      }}
    />
  );
}
