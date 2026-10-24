"use client";

import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useCancelCobroRep } from "../hooks/useCancelCobroRep";
import type { Cobro } from "../interfaces/collection.interface";
import { cobroLabel } from "../utils/collection.utils";
import { CobroActionConfirmDialog } from "./CobroActionConfirmDialog";

/** Lo mínimo para cancelar el REP y nombrarlo. */
export type CobroRepCancelTarget = Pick<Cobro, "id" | "folio" | "rep_uuid">;

interface CobroRepCancelDialogProps {
  cobro: CobroRepCancelTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación de "Cancelar REP" (`POST /finanzas/cobros/{id}/cancelar-rep/`).
 *
 * El cobro objetivo es la copia tomada al ABRIR (`useDialogSession`): tras
 * cancelar, la fila se relee sin `rep_uuid` y el diálogo debe seguir nombrando
 * el mismo REP mientras se cierra.
 *
 * El ciclo de cierre es el de `CobroActionConfirmDialog`.
 */
export function CobroRepCancelDialog({ cobro, open, onOpenChange }: CobroRepCancelDialogProps) {
  const session = useDialogSession(open, cobro);
  const target = session.snapshot;
  const label = target ? cobroLabel(target) : "";
  const uuidLabel = target?.rep_uuid ? ` (UUID ${target.rep_uuid})` : "";

  const { cancelRep, isCancellingRep } = useCancelCobroRep(target?.id ?? 0);

  return (
    <CobroActionConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancelar REP"
      description={`Se cancelará ante el SAT, con Facturama, el complemento de pago (REP) del cobro ${label}${uuidLabel} con motivo 02 (comprobante emitido con errores sin relación). El SAT puede pedir que el receptor acepte la cancelación: en ese caso el REP sigue vigente hasta que la acepte y habrá que volver a cancelarlo. El cobro no cambia: sus saldos, banco y póliza se quedan igual.`}
      confirmText="Cancelar REP"
      busyText="Cancelando…"
      confirmColor="red"
      run={target ? cancelRep : null}
      isRunning={isCancellingRep}
    />
  );
}
