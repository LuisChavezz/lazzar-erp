"use client";

import { StampConfirmDialog } from "@/src/components/StampConfirmDialog";
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
 * (`POST /finanzas/notas-credito/{id}/timbrar/`). Mismo diálogo que el de la
 * factura (`StampConfirmDialog`), con el candado por nota de
 * `useStampNotaCredito`.
 */
export function CreditNoteStampDialog({ nota, open, onOpenChange }: CreditNoteStampDialogProps) {
  const session = useDialogSession(open, nota);
  const target = session.snapshot;
  const notaLabel = target ? target.folio || `#${target.id}` : "";
  const facturaLabel = target?.factura_folio ? ` ${target.factura_folio}` : "";

  const { stamp, isStamping } = useStampNotaCredito(target?.id ?? 0);

  return (
    <StampConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Timbrar nota de crédito"
      description={`Se timbrará ante el SAT el CFDI de egreso de la nota ${notaLabel}, relacionado con la factura${facturaLabel}. Es un acto fiscal irreversible: una vez timbrado, el CFDI no puede cancelarse desde el ERP.`}
      isStamping={isStamping}
      onConfirm={() => {
        if (!target) return;
        // Cierre directo, sin pasar por la guarda de `StampConfirmDialog`: al
        // terminar, el `isStamping` capturado en este render todavía no se
        // actualizó.
        stamp({ onSettled: () => onOpenChange(false) });
      }}
    />
  );
}
