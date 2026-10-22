"use client";

import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useCancelCobro } from "../hooks/useCancelCobro";
import type { Cobro } from "../interfaces/collection.interface";
import { CobroActionConfirmDialog } from "./CobroActionConfirmDialog";

/** Lo mínimo para cancelar y describir el cobro. */
export type CollectionCancelTarget = Pick<Cobro, "id" | "estatus">;

interface CollectionCancelDialogProps {
  cobro: CollectionCancelTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación de "Cancelar cobro" (`POST /finanzas/cobros/{id}/cancelar/`).
 *
 * El cobro objetivo es la copia tomada al ABRIR (`useDialogSession`): tras
 * cancelar, la fila pasa a `Cancelado` y puede salir de un filtro de estatus;
 * el diálogo sigue hablando del mismo cobro mientras se cierra.
 *
 * El texto depende del estatus: un `Aplicado` revierte saldos de CxC, banco y
 * póliza; un `Borrador` nunca movió nada, así que no se promete reversión.
 *
 * El ciclo de cierre es el de `CobroActionConfirmDialog`.
 */
export function CollectionCancelDialog({ cobro, open, onOpenChange }: CollectionCancelDialogProps) {
  const session = useDialogSession(open, cobro);
  const target = session.snapshot;
  const cobroLabel = target ? `#${target.id}` : "";

  const { cancel, isCancelling } = useCancelCobro(target?.id ?? 0);

  const description =
    target?.estatus === "Borrador"
      ? `El cobro ${cobroLabel} quedará como Cancelado. Es un borrador: no movió saldos, banco ni póliza, así que no hay nada que revertir. Esta acción no se puede deshacer.`
      : `El cobro ${cobroLabel} quedará como Cancelado: el saldo de sus cuentas por cobrar vuelve a quedar pendiente, se descuenta de la cuenta bancaria, su movimiento bancario se cancela y se genera la contrapóliza. Esta acción no se puede deshacer.`;

  return (
    <CobroActionConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancelar cobro"
      description={description}
      confirmText="Cancelar cobro"
      busyText="Cancelando…"
      confirmColor="red"
      run={target ? cancel : null}
      isRunning={isCancelling}
    />
  );
}
