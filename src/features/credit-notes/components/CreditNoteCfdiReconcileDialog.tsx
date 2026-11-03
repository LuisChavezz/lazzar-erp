"use client";

import { useDialogSession } from "@/src/hooks/useDialogSession";
import { CfdiReconcileConfirmDialog } from "@/src/features/invoicing/components/CfdiReconcileConfirmDialog";
import { useReconcileNotaCreditoCfdi } from "../hooks/useReconcileNotaCreditoCfdi";

/** Lo mínimo para conciliar y nombrar la nota. */
export interface CreditNoteCfdiReconcileTarget {
  id: number;
  folio: string | null;
}

interface CreditNoteCfdiReconcileDialogProps {
  nota: CreditNoteCfdiReconcileTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación de "Conciliar con Facturama" de una nota de crédito
 * (`POST /finanzas/notas-credito/{id}/conciliar-cfdi/`), con el candado por
 * nota de `useReconcileNotaCreditoCfdi`.
 */
export function CreditNoteCfdiReconcileDialog({
  nota,
  open,
  onOpenChange,
}: CreditNoteCfdiReconcileDialogProps) {
  const session = useDialogSession(open, nota);
  const target = session.snapshot;
  const notaLabel = target ? target.folio || `#${target.id}` : "";

  const { reconcile, isReconciling, isIdle } = useReconcileNotaCreditoCfdi(target?.id ?? 0);

  return (
    <CfdiReconcileConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Conciliar con Facturama"
      description={`Se buscará en Facturama el CFDI de egreso de la nota ${notaLabel}, cuyo timbrado nunca se confirmó. Si existe, la nota quedará timbrada con él; si no, se liberará el timbrado pendiente y podrás volver a timbrarla o cancelarla.`}
      isReconciling={isReconciling}
      isIdle={isIdle}
      onConfirm={() => {
        if (!target) return;
        reconcile({ onSettled: () => onOpenChange(false) });
      }}
    />
  );
}
