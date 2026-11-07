"use client";

import { useState } from "react";
import { StampConfirmDialog } from "@/src/components/StampConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useCancelCancelledInvoiceCfdi } from "../hooks/useCancelCancelledInvoiceCfdi";
import {
  CANCEL_CANCELLED_INVOICE_CFDI_LABEL,
  CANCELLED_INVOICE_CFDI_ALREADY_REQUESTED_MESSAGE,
  isInvoiceCfdiCancellationRequested,
} from "../utils/invoiceCancellation";

/** Lo mínimo para nombrar la factura y avisar de la cancelación ya solicitada (fila o retrieve). */
export interface CancelledInvoiceCfdiCancelTarget {
  id: number;
  folio: string | null;
  cfdi_cancelado?: boolean;
  cfdi_cancelacion_solicitada?: boolean;
}

interface CancelledInvoiceCfdiCancelDialogProps {
  invoice: CancelledInvoiceCfdiCancelTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Aviso cuando el precheck encontró la cancelación solicitada después de abrir el diálogo. */
const REQUESTED_SINCE_OPENED_MESSAGE =
  "La cancelación del CFDI se solicitó después de abrir este diálogo. Revisa el aviso y confirma de nuevo.";

/**
 * Confirmación de "Cancelar CFDI ante el SAT" para una factura que YA está
 * `Cancelada` en el ERP y cuyo CFDI sigue vigente (EC-764). Distinto de
 * `InvoiceCancelDialog`: no hay nota interna (el backend descarta `motivo` en
 * este caso) y el texto dice que en el ERP no cambia nada más.
 *
 * Lo monta el dueño de la vista (`InvoiceList`, `InvoiceMainSheet`), no la
 * celda. Usa la confirmación del timbrado (`StampConfirmDialog`): no se cierra
 * a media petición y se cierra al TERMINAR con cualquier resultado. El
 * toast dice qué pasó y, ante una falla de red o de Facturama, el refetch
 * muestra el estado real del CFDI antes de reintentar. Si la cancelación quedó
 * solicitada después de abrirlo, el hook no hace el POST: el diálogo sigue
 * abierto con la factura fresca, su aviso y una nota, y pide confirmar de nuevo.
 */
export function CancelledInvoiceCfdiCancelDialog({
  invoice,
  open,
  onOpenChange,
}: CancelledInvoiceCfdiCancelDialogProps) {
  const session = useDialogSession(open, invoice);
  // Factura fresca de ESTA apertura cuando hubo que reconfirmar (`needs-confirmation`).
  const [fresh, setFresh] = useState<{
    sessionId: number;
    invoice: CancelledInvoiceCfdiCancelTarget;
  } | null>(null);
  const reconfirm = fresh !== null && fresh.sessionId === session.id;
  const target = reconfirm ? fresh.invoice : session.snapshot;
  const invoiceLabel = target ? target.folio || `#${target.id}` : "";
  const requested = target ? isInvoiceCfdiCancellationRequested(target) : false;

  const { cancelCfdi, isCancelling, isIdle } = useCancelCancelledInvoiceCfdi(target?.id ?? 0);

  const description =
    (reconfirm ? `${REQUESTED_SINCE_OPENED_MESSAGE} ` : "") +
    `La factura ${invoiceLabel} ya está cancelada en el ERP, pero su CFDI sigue vigente ante el SAT. ` +
    "Se cancelará solo el CFDI ante el SAT, con motivo 02 (comprobante emitido con errores sin relación). " +
    "En el ERP no cambia nada más: ni el estatus de la factura, ni su cuenta por cobrar, ni el inventario, ni las pólizas." +
    (requested ? ` ${CANCELLED_INVOICE_CFDI_ALREADY_REQUESTED_MESSAGE}` : "");

  return (
    <StampConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={CANCEL_CANCELLED_INVOICE_CFDI_LABEL}
      description={description}
      confirmText="Cancelar CFDI"
      busyText="Cancelando CFDI…"
      confirmColor="red"
      isStamping={isCancelling}
      isIdle={isIdle}
      onConfirm={() => {
        if (!target) return;
        const sessionId = session.id;
        cancelCfdi(
          { shownRequested: requested },
          {
            onDone: () => onOpenChange(false),
            onNeedsConfirmation: (invoice) => setFresh({ sessionId, invoice }),
          },
        );
      }}
    />
  );
}
