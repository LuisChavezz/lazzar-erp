"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useQuitarOpportunityCotizacion } from "../hooks/useOpportunityCotizacionLinks";
import type { OpportunityCotizacion } from "../interfaces/opportunity-onboarding.interface";

interface OpportunityQuitarCotizacionDialogProps {
  opportunityId: number;
  /** Cotización por quitar; `null` = cerrado. */
  cotizacion: OpportunityCotizacion | null;
  /** Cierra el diálogo (quien lo monta pone `cotizacion` en `null`). */
  onClose: () => void;
}

/**
 * Confirmación de "Quitar" una cotización de la oportunidad. No la borra: la
 * cotización sigue existiendo, solo queda sin oportunidad, y el texto lo dice.
 *
 * Queda abierta y bloqueada (`busy`) hasta que el servidor responde y la
 * pantalla se relee; entonces se cierra, con éxito o con error (el aviso lo da
 * el hook). Siempre montada y abierta por `cotizacion`, como
 * `OpportunitySeguimientoDeleteDialog`.
 */
export function OpportunityQuitarCotizacionDialog({
  opportunityId,
  cotizacion,
  onClose,
}: OpportunityQuitarCotizacionDialogProps) {
  const { mutate: quitar, isPending } = useQuitarOpportunityCotizacion(opportunityId);

  // El texto sigue nombrando la última cotización mientras el diálogo se
  // cierra, cuando `cotizacion` ya es `null`.
  const shown = useDialogSession(cotizacion !== null, cotizacion).snapshot;

  return (
    <ConfirmDialog
      open={cotizacion !== null}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
      title="Quitar Cotización"
      description={`La cotización${
        shown ? ` #${shown.id}` : ""
      } dejará de estar ligada a esta oportunidad. La cotización no se elimina y se puede volver a ligar después.`}
      confirmText={isPending ? "Quitando…" : "Quitar"}
      confirmColor="red"
      closeOnConfirm={false}
      busy={isPending}
      onConfirm={() => {
        if (cotizacion) quitar(cotizacion.id, { onSettled: onClose });
      }}
    />
  );
}
