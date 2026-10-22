"use client";

import { StampConfirmDialog } from "@/src/components/StampConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useStampInvoice } from "../hooks/useStampInvoice";

/** Lo mínimo para timbrar y nombrar la factura. */
export interface InvoiceStampTarget {
  id: number;
  folio: string | null;
}

interface InvoiceStampDialogProps {
  invoice: InvoiceStampTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación del TIMBRADO del CFDI (`POST /finanzas/facturas/{id}/timbrar/`).
 * El comportamiento del diálogo (no cerrarse a media petición, cerrarse al
 * terminar) vive en `StampConfirmDialog`; el doble envío lo corta además el
 * candado por factura de `useStampInvoice`.
 */
export function InvoiceStampDialog({ invoice, open, onOpenChange }: InvoiceStampDialogProps) {
  const session = useDialogSession(open, invoice);
  const target = session.snapshot;
  const invoiceLabel = target ? target.folio || `#${target.id}` : "";

  const { stamp, isStamping } = useStampInvoice(target?.id ?? 0);

  return (
    <StampConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Timbrar factura"
      description={`Se timbrará el CFDI de la factura ${invoiceLabel} ante el SAT. Es un acto fiscal irreversible: una vez timbrado, el CFDI solo puede anularse cancelándolo ante el SAT.`}
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
