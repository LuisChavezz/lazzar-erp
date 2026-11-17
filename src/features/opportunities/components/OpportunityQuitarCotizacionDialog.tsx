"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import { useQuitarOpportunityCotizacion } from "../hooks/useOpportunityCotizacionLinks";
import { useOpportunityStaleNotice } from "../hooks/useOpportunityStaleNotice";
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
 *
 * - Candado SÍNCRONO por cotización (`useRowActionLock`), tomado al confirmar:
 *   un doble clic manda un solo DELETE.
 * - Aviso de fila obsoleta (`useOpportunityStaleNotice`): si al abrir el
 *   detalle dice que la oportunidad ya no existe, que la cotización ya no está
 *   ligada o que ya se autorizó, se cierra con aviso.
 */
export function OpportunityQuitarCotizacionDialog({
  opportunityId,
  cotizacion,
  onClose,
}: OpportunityQuitarCotizacionDialogProps) {
  const { mutate: quitar } = useQuitarOpportunityCotizacion(opportunityId);
  const lock = useRowActionLock();
  const cotizacionId = cotizacion?.id ?? null;
  const isPending = lock.isPending(cotizacionId);

  useOpportunityStaleNotice({
    action: { kind: "quitar", cotizacionId: cotizacionId ?? 0 },
    opportunityId: cotizacion ? opportunityId : null,
    isBusy: isPending,
    onClose,
  });

  // El texto sigue nombrando la última cotización mientras el diálogo se
  // cierra, cuando `cotizacion` ya es `null`.
  const shown = useDialogSession(cotizacion !== null, cotizacion).snapshot;

  return (
    <ConfirmDialog
      open={cotizacion !== null}
      {...lock.guardClose(cotizacionId, onClose)}
      title="Quitar Cotización"
      description={`La cotización${
        shown ? ` #${shown.id}` : ""
      } dejará de estar ligada a esta oportunidad. La cotización no se elimina y se puede volver a ligar después.`}
      confirmText={isPending ? "Quitando…" : "Quitar"}
      confirmColor="red"
      closeOnConfirm={false}
      onConfirm={() => {
        if (!cotizacion || !lock.acquire(cotizacion.id)) return;
        const { id } = cotizacion;
        quitar(id, {
          onSettled: () => {
            lock.release(id);
            onClose();
          },
        });
      }}
    />
  );
}
