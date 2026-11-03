"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";

interface CfdiReconcileConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** ¿Hay una conciliación en vuelo? Solo pinta. */
  isReconciling: boolean;
  /** Lectura SÍNCRONA del candado de la conciliación: decide si se puede cerrar. */
  isIdle: () => boolean;
  /** Dispara la conciliación; el llamador cierra el diálogo al terminar. */
  onConfirm: () => void;
}

/**
 * Confirmación de "Conciliar con Facturama" (`conciliar-cfdi/`, EC-709) de
 * facturas y notas de crédito. Mismo comportamiento que `StampConfirmDialog`:
 * no se cierra ni se reenvía a media petición (lo decide `isIdle()`) y el
 * llamador lo cierra al terminar, con cualquier resultado; el toast dice qué
 * pasó y el refetch muestra el estado real.
 */
export function CfdiReconcileConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  isReconciling,
  isIdle,
  onConfirm,
}: CfdiReconcileConfirmDialogProps) {
  const handleOpenChange = (next: boolean) => {
    if (!next && !isIdle()) return;
    onOpenChange(next);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      confirmText={isReconciling ? "Conciliando…" : "Conciliar"}
      cancelText="Volver"
      confirmColor="blue"
      closeOnConfirm={false}
      busy={isReconciling}
      onConfirm={onConfirm}
    />
  );
}
