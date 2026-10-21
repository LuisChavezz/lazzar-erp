"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useStampNotaCredito } from "../hooks/useStampNotaCredito";

/** Lo mínimo para timbrar y nombrar la nota. */
export interface CreditNoteStampTarget {
  id: number;
  folio: string | null;
  factura_folio: string | null;
}

interface CreditNoteStampDialogProps {
  nota: CreditNoteStampTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación del TIMBRADO del CFDI de egreso
 * (`POST /finanzas/notas-credito/{id}/timbrar/`). Mismo comportamiento que
 * `InvoiceStampDialog`: no se puede cerrar ni reenviar a media petición y se
 * cierra al TERMINAR con cualquier resultado, porque un timeout de Facturama
 * pudo timbrar de todos modos y el refetch muestra el estado real.
 */
export function CreditNoteStampDialog({ nota, open, onOpenChange }: CreditNoteStampDialogProps) {
  const session = useDialogSession(open, nota);
  const target = session.snapshot;
  const notaLabel = target ? target.folio || `#${target.id}` : "";
  const facturaLabel = target?.factura_folio ? ` ${target.factura_folio}` : "";

  const { stamp, isStamping } = useStampNotaCredito(target?.id ?? 0);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado debe verse.
    if (!next && isStamping) return;
    onOpenChange(next);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Timbrar nota de crédito"
      description={`Se timbrará ante el SAT el CFDI de egreso de la nota ${notaLabel}, relacionado con la factura${facturaLabel}. Es un acto fiscal irreversible: una vez timbrado, el CFDI no puede cancelarse desde el ERP.`}
      confirmText={isStamping ? "Timbrando…" : "Timbrar"}
      cancelText="Volver"
      confirmColor="blue"
      closeOnConfirm={false}
      busy={isStamping}
      onConfirm={() => {
        if (!target) return;
        // Cierre directo, sin pasar por `handleOpenChange`: al terminar, el
        // `isStamping` capturado en este render todavía no se actualizó.
        stamp({ onSettled: () => onOpenChange(false) });
      }}
    />
  );
}
