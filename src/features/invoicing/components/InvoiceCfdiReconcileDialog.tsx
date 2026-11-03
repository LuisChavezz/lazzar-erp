"use client";

import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useReconcileInvoiceCfdi } from "../hooks/useReconcileInvoiceCfdi";
import { CfdiReconcileConfirmDialog } from "./CfdiReconcileConfirmDialog";

/** Lo mínimo para conciliar y nombrar la factura. */
export interface InvoiceCfdiReconcileTarget {
  id: number;
  folio: string | null;
}

interface InvoiceCfdiReconcileDialogProps {
  invoice: InvoiceCfdiReconcileTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación de "Conciliar con Facturama" de una factura
 * (`POST /finanzas/facturas/{id}/conciliar-cfdi/`), con el candado por factura
 * de `useReconcileInvoiceCfdi`.
 */
export function InvoiceCfdiReconcileDialog({
  invoice,
  open,
  onOpenChange,
}: InvoiceCfdiReconcileDialogProps) {
  const session = useDialogSession(open, invoice);
  const target = session.snapshot;
  const invoiceLabel = target ? target.folio || `#${target.id}` : "";

  const { reconcile, isReconciling, isIdle } = useReconcileInvoiceCfdi(target?.id ?? 0);

  return (
    <CfdiReconcileConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Conciliar con Facturama"
      description={`Se buscará en Facturama el CFDI de la factura ${invoiceLabel}, cuyo timbrado nunca se confirmó. Si existe, la factura quedará timbrada con él; si no, se liberará el timbrado pendiente y podrás volver a timbrarla o cancelarla.`}
      isReconciling={isReconciling}
      isIdle={isIdle}
      onConfirm={() => {
        if (!target) return;
        reconcile({ onSettled: () => onOpenChange(false) });
      }}
    />
  );
}
