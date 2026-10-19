"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
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
 *
 * Mientras la petición está en vuelo (`busy`) no se puede cerrar ni reenviar:
 * Confirmar y Volver quedan deshabilitados y Esc y el clic fuera se ignoran.
 * El doble envío lo corta además el candado por factura de `useStampInvoice`.
 *
 * Se cierra al TERMINAR, con cualquier resultado: el toast dice qué pasó y, si
 * falló, el botón sigue en la cabecera. No queda abierto para reintentar de
 * inmediato porque una falla de red o un timeout de Facturama puede haber
 * timbrado de todos modos; el refetch del retrieve muestra el estado real.
 */
export function InvoiceStampDialog({ invoice, open, onOpenChange }: InvoiceStampDialogProps) {
  const session = useDialogSession(open, invoice);
  const target = session.snapshot;
  const invoiceLabel = target ? target.folio || `#${target.id}` : "";

  const { stamp, isStamping } = useStampInvoice(target?.id ?? 0);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado debe verse.
    if (!next && isStamping) return;
    onOpenChange(next);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Timbrar factura"
      description={`Se timbrará el CFDI de la factura ${invoiceLabel} ante el SAT. Es un acto fiscal irreversible: una vez timbrado, el CFDI solo puede anularse cancelándolo ante el SAT.`}
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
