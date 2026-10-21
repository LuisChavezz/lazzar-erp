"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useStampCobroRep } from "../hooks/useStampCobroRep";

/** Lo mínimo para timbrar y nombrar el cobro. */
export interface CobroRepStampTarget {
  id: number;
}

interface CobroRepStampDialogProps {
  cobro: CobroRepStampTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación del TIMBRADO del REP (`POST /finanzas/cobros/{id}/timbrar-rep/`).
 *
 * El cobro objetivo es la copia tomada al ABRIR (`useDialogSession`): la fila
 * del listado se relee mientras el diálogo está abierto (y tras timbrar), y el
 * diálogo debe seguir hablando del mismo cobro.
 *
 * Mientras la petición está en vuelo (`busy`) no se puede cerrar ni reenviar.
 * Se cierra al TERMINAR, con cualquier resultado: el toast dice qué pasó (el
 * UUID o el mensaje del backend tal cual). No queda abierto para reintentar,
 * porque una falla de Facturama pudo timbrar de todos modos; el refetch del
 * listado muestra el estado real (`rep_uuid` o `rep_pendiente`).
 */
export function CobroRepStampDialog({ cobro, open, onOpenChange }: CobroRepStampDialogProps) {
  const session = useDialogSession(open, cobro);
  const target = session.snapshot;
  const cobroLabel = target ? `#${target.id}` : "";

  const { stamp, isStamping } = useStampCobroRep(target?.id ?? 0);

  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado debe verse.
    if (!next && isStamping) return;
    onOpenChange(next);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Timbrar REP"
      description={`Se timbrará el complemento de pago (REP) del cobro ${cobroLabel} ante el SAT con Facturama. Es un timbrado real y no se puede deshacer desde aquí: una vez timbrado, el REP solo puede anularse cancelándolo ante el SAT.`}
      confirmText={isStamping ? "Timbrando…" : "Timbrar REP"}
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
