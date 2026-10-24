"use client";

import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useStampCobroRep } from "../hooks/useStampCobroRep";
import type { Cobro } from "../interfaces/collection.interface";
import { cobroLabel } from "../utils/collection.utils";
import { CobroActionConfirmDialog } from "./CobroActionConfirmDialog";

/** Lo mínimo para timbrar y nombrar el cobro. */
export type CobroRepStampTarget = Pick<Cobro, "id" | "folio">;

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
 * El ciclo de cierre es el de `CobroActionConfirmDialog`. No queda abierto para
 * reintentar, porque una falla de Facturama pudo timbrar de todos modos; el
 * refetch del listado muestra el estado real (`rep_uuid` o `rep_pendiente`).
 */
export function CobroRepStampDialog({ cobro, open, onOpenChange }: CobroRepStampDialogProps) {
  const session = useDialogSession(open, cobro);
  const target = session.snapshot;
  const label = target ? cobroLabel(target) : "";

  const { stamp, isStamping } = useStampCobroRep(target?.id ?? 0);

  return (
    <CobroActionConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Timbrar REP"
      description={`Se timbrará el complemento de pago (REP) del cobro ${label} ante el SAT con Facturama. Es un timbrado real y no se puede deshacer desde aquí: una vez timbrado, el REP solo puede anularse cancelándolo ante el SAT.`}
      confirmText="Timbrar REP"
      busyText="Timbrando…"
      confirmColor="blue"
      run={target ? stamp : null}
      isRunning={isStamping}
    />
  );
}
