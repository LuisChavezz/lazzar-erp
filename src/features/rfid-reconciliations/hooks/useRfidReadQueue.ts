"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { addRfidReconciliationRead } from "../services/actions";
import { refreshDetailAfterReads } from "../utils/rfidReconciliationCache";
import {
  EMPTY_READ_TALLY,
  RfidReadQueueCore,
  tallyRead,
  type RfidReadTally,
  type RfidSessionRead,
} from "../utils/rfidReadQueueCore";

export type { RfidReadTally, RfidSessionRead };

/** Una lectura que el backend no guardó, con su mensaje. */
export interface RfidRejectedRead {
  key: number;
  code: string;
  message: string;
}

/** Cuántas lecturas de la sesión se muestran. */
const SESSION_READS_LIMIT = 50;

interface UseRfidReadQueueOptions {
  reconciliationId: number;
  /** EPC normalizados que el encuadre ya tiene (`knownReadEpcs`): se avisan sin pedirlos. */
  knownEpcs: ReadonlySet<string>;
}

/**
 * Cola de lecturas de un encuadre (`RfidReadQueueCore`, ver ahí las reglas):
 * una a la vez por `{epc}`, "Ya leído" sin petición para lo ya conocido, y se
 * DETIENE (hasta que el panel se monte otra vez) con un `400 estatus`, `404` o
 * `403`.
 *
 * Además de la lista de la sesión (las últimas 50), lleva los totales por
 * resultado (`tally`) y TODAS las rechazadas con el mensaje del backend
 * (`rejected`), sin tope: con una tarima completa un rechazo no se pierde de
 * vista.
 *
 * Al terminar cada tanda relee SOLO el detalle (resumen y lecturas): el
 * listado se relee una vez, al pausar la lectura o cerrar el detalle
 * (`refreshListAfterReading`), no cada pocos segundos durante la lectura.
 */
export function useRfidReadQueue({ reconciliationId, knownEpcs }: UseRfidReadQueueOptions) {
  const queryClient = useQueryClient();
  const [reads, setReads] = useState<RfidSessionRead[]>([]);
  const [pending, setPending] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [tally, setTally] = useState<RfidReadTally>(EMPTY_READ_TALLY);
  const [rejected, setRejected] = useState<RfidRejectedRead[]>([]);
  // Una cola por montaje del panel, creada en el primer render.
  const [core] = useState(
    () =>
      new RfidReadQueueCore({
        send: (epc) => addRfidReconciliationRead({ id: reconciliationId, epc }),
        onAdd: (read) => setReads((prev) => [read, ...prev].slice(0, SESSION_READS_LIMIT)),
        onUpdate: (key, feedback) =>
          setReads((prev) => prev.map((read) => (read.key === key ? { ...read, ...feedback } : read))),
        onPending: setPending,
        onStop: (message) => {
          setStopped(true);
          toast.error(message, { id: `rfid-read-stop-${reconciliationId}` });
        },
        onDrained: () => refreshDetailAfterReads(queryClient, reconciliationId),
        onOutcome: (outcome) => {
          setTally((current) => tallyRead(current, outcome));
          if (outcome.kind === "rechazada") {
            setRejected((current) => [
              { key: current.length + 1, code: outcome.code, message: outcome.message },
              ...current,
            ]);
          }
        },
      }),
  );

  useEffect(() => {
    core.setKnown(knownEpcs);
  });

  useEffect(() => {
    core.activate();
    return () => core.dispose();
  }, [core]);

  return { reads, pending, stopped, tally, rejected, enqueue: (epc: string) => core.enqueue(epc) };
}
