"use client";

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
 * muestra el estado real del CFDI antes de reintentar.
 */
export function CancelledInvoiceCfdiCancelDialog({
  invoice,
  open,
  onOpenChange,
}: CancelledInvoiceCfdiCancelDialogProps) {
  const session = useDialogSession(open, invoice);
  const target = session.snapshot;
  const invoiceLabel = target ? target.folio || `#${target.id}` : "";
  const requested = target ? isInvoiceCfdiCancellationRequested(target) : false;

  const { cancelCfdi, isCancelling, isIdle } = useCancelCancelledInvoiceCfdi(target?.id ?? 0);

  const description =
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
        cancelCfdi({ onSettled: () => onOpenChange(false) });
      }}
    />
  );
}
