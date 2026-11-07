"use client";

import { useState } from "react";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { SatCancelMotiveSelect } from "@/src/components/SatCancelMotiveSelect";
import {
  SAT_CANCEL_MOTIVE_LOCKED_SINCE_OPENED_MESSAGE,
  type SatCancelMotive,
} from "@/src/constants/satCancelMotives";
import { useCancelCobroRep } from "../hooks/useCancelCobroRep";
import type { Cobro } from "../interfaces/collection.interface";
import { cobroLabel } from "../utils/collection.utils";
import { getCobroRepLockedSatCancelMotive } from "../utils/cobroRepCancellation";
import { CobroActionConfirmDialog } from "./CobroActionConfirmDialog";

/** Lo mínimo para cancelar el REP, nombrarlo y fijar su motivo SAT. */
export type CobroRepCancelTarget = Pick<
  Cobro,
  | "id"
  | "folio"
  | "rep_uuid"
  | "rep_cancelacion_solicitada"
  | "rep_cancelacion_motivo"
  | "rep_cancelacion_en_curso_desde"
>;

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
 * Pide el motivo SAT (`SatCancelMotiveSelect`, EC-808): obligatorio y sin
 * valor por defecto; Confirmar queda deshabilitado sin él. Con la cancelación
 * ya solicitada o un intento sin respuesta muestra el motivo fijo, bloqueado.
 * Si el motivo quedó fijo en otro después de abrirlo, el hook no hace el POST
 * (`needs-confirmation`): el diálogo sigue abierto con el cobro fresco, su
 * motivo fijo y un aviso, y pide confirmar de nuevo.
 * El motivo elegido y el cobro fresco son estado de ESTA apertura (llevan el
 * `session.id`): una apertura nueva arranca sin motivo sin remontar el
 * `Dialog.Root`.
 *
 * El ciclo de cierre es el de `CobroActionConfirmDialog`.
 */
export function CobroRepCancelDialog({ cobro, open, onOpenChange }: CobroRepCancelDialogProps) {
  const session = useDialogSession(open, cobro);
  // Cobro fresco de ESTA apertura cuando hubo que reconfirmar (`needs-confirmation`).
  const [fresh, setFresh] = useState<{ sessionId: number; cobro: CobroRepCancelTarget } | null>(
    null,
  );
  const reconfirm = fresh !== null && fresh.sessionId === session.id;
  const target = reconfirm ? fresh.cobro : session.snapshot;
  const label = target ? cobroLabel(target) : "";
  const uuidLabel = target?.rep_uuid ? ` (UUID ${target.rep_uuid})` : "";
  const [choice, setChoice] = useState<{ sessionId: number; motive: SatCancelMotive } | null>(
    null,
  );
  const lockedMotive = target ? getCobroRepLockedSatCancelMotive(target) : null;
  const chosenMotive = choice !== null && choice.sessionId === session.id ? choice.motive : null;
  const motivoSat = lockedMotive ?? chosenMotive;

  const { cancelRep, isCancellingRep, isIdle } = useCancelCobroRep(target?.id ?? 0);

  return (
    <CobroActionConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancelar REP"
      description={`${reconfirm ? `${SAT_CANCEL_MOTIVE_LOCKED_SINCE_OPENED_MESSAGE} ` : ""}Se cancelará ante el SAT, con Facturama, el complemento de pago (REP) del cobro ${label}${uuidLabel} con el motivo que elijas. El SAT puede pedir que el receptor acepte la cancelación: en ese caso el REP sigue vigente hasta que la acepte y habrá que volver a cancelarlo. El cobro no cambia: sus saldos, banco y póliza se quedan igual.`}
      confirmText="Cancelar REP"
      busyText="Cancelando…"
      confirmColor="red"
      run={
        target && motivoSat !== null
          ? (options) => {
              const sessionId = session.id;
              cancelRep({
                variables: { motivoSat },
                // Sin POST el diálogo sigue abierto con el motivo fijo; con
                // cualquier otro resultado se cierra como siempre.
                onSettled: (result) =>
                  result?.outcome === "needs-confirmation"
                    ? setFresh({ sessionId, cobro: result.cobro })
                    : options.onSettled?.(),
              });
            }
          : null
      }
      isRunning={isCancellingRep}
      isIdle={isIdle}
      confirmDisabled={motivoSat === null}
    >
      {target && (
        <SatCancelMotiveSelect
          id={`cobro-rep-cancel-motivo-sat-${target.id}`}
          value={chosenMotive}
          lockedMotive={lockedMotive}
          disabled={isCancellingRep}
          onChange={(motive) => setChoice({ sessionId: session.id, motive })}
        />
      )}
    </CobroActionConfirmDialog>
  );
}
