"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useCancelCobroRep } from "../hooks/useCancelCobroRep";
import type { Cobro } from "../interfaces/collection.interface";

/** Lo mínimo para cancelar el REP y nombrarlo. */
export type CobroRepCancelTarget = Pick<Cobro, "id" | "rep_uuid">;

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
 * Mientras la petición está en vuelo (`busy`) no se puede cerrar ni reenviar.
 * Se cierra al TERMINAR, con cualquier resultado; el toast dice qué pasó.
 */
export function CobroRepCancelDialog({ cobro, open, onOpenChange }: CobroRepCancelDialogProps) {
  const session = useDialogSession(open, cobro);
  const target = session.snapshot;
  const cobroLabel = target ? `#${target.id}` : "";
  const uuidLabel = target?.rep_uuid ? ` (UUID ${target.rep_uuid})` : "";

  const { cancelRep, isCancellingRep } = useCancelCobroRep(target?.id ?? 0);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado debe verse.
    if (!next && isCancellingRep) return;
    onOpenChange(next);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Cancelar REP"
      description={`Se cancelará ante el SAT, con Facturama, el complemento de pago (REP) del cobro ${cobroLabel}${uuidLabel} con motivo 02 (comprobante emitido con errores sin relación). El SAT puede pedir que el receptor acepte la cancelación: en ese caso el REP sigue vigente hasta que la acepte y habrá que volver a cancelarlo. El cobro no cambia: sus saldos, banco y póliza se quedan igual.`}
      confirmText={isCancellingRep ? "Cancelando…" : "Cancelar REP"}
      cancelText="Volver"
      confirmColor="red"
      closeOnConfirm={false}
      busy={isCancellingRep}
      onConfirm={() => {
        if (!target) return;
        // Cierre directo, sin pasar por `handleOpenChange`: al terminar, el
        // `isCancellingRep` capturado en este render todavía no se actualizó.
        cancelRep({ onSettled: () => onOpenChange(false) });
      }}
    />
  );
}
