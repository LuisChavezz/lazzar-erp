"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { addRfidReconciliationRead } from "../services/actions";
import { RFID_RECONCILIATIONS_KEY } from "../constants/rfidReconciliations";
import {
  classifyReadError,
  normalizeTag,
  readErrorFeedback,
  readSuccessFeedback,
  type RfidReadFeedback,
} from "../utils/rfidReadResult";

/** Una lectura de la sesión de escaneo, la más reciente primero. */
export interface RfidSessionRead extends RfidReadFeedback {
  key: number;
  code: string;
}

/** Cuántas lecturas de la sesión se muestran. */
const SESSION_READS_LIMIT = 50;

interface UseRfidReadQueueOptions {
  reconciliationId: number;
  /** Los `codigo_tag` que el encuadre ya tiene: se avisan sin pedirlos otra vez. */
  knownTags: ReadonlySet<string>;
}

/**
 * Cola de lecturas de un encuadre: manda los códigos UNO A LA VEZ
 * (`POST .../lecturas/`), en el orden en que llegaron, para que el lector de
 * mano o la antena nunca disparen dos envíos a la vez.
 *
 * - Un código que el encuadre ya tiene, o que ya se mandó en esta sesión, se
 *   avisa como "Ya leído" sin petición. El `400 {"codigo_tag"}` del backend
 *   dice lo mismo y tampoco es un error.
 * - `400 {"estatus"}` (se aceptó o canceló en otro lado), `404` o `403`
 *   detienen la cola: lo que quedaba se descarta, se avisa con el mensaje del
 *   backend y se relee el encuadre.
 * - Al vaciarse la cola se relee el encuadre (resumen y lecturas) y su fila
 *   del listado: el resumen lo calcula el backend.
 */
export function useRfidReadQueue({ reconciliationId, knownTags }: UseRfidReadQueueOptions) {
  const queryClient = useQueryClient();
  const [reads, setReads] = useState<RfidSessionRead[]>([]);
  const [pending, setPending] = useState(0);
  const queueRef = useRef<{ key: number; code: string }[]>([]);
  const sentRef = useRef<Set<string>>(new Set());
  const runningRef = useRef(false);
  const aliveRef = useRef(true);
  const seqRef = useRef(0);
  const knownRef = useRef(knownTags);

  useEffect(() => {
    knownRef.current = knownTags;
  });

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      queueRef.current = [];
    };
  }, []);

  const update = (key: number, feedback: RfidReadFeedback) =>
    setReads((prev) => prev.map((read) => (read.key === key ? { ...read, ...feedback } : read)));

  const drain = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    let changed = 0;
    try {
      while (queueRef.current.length > 0 && aliveRef.current) {
        const next = queueRef.current.shift()!;
        setPending(queueRef.current.length + 1);
        try {
          const read = await addRfidReconciliationRead({ id: reconciliationId, codigoTag: next.code });
          changed += 1;
          update(next.key, readSuccessFeedback(read));
        } catch (error) {
          const { kind, message } = classifyReadError(error);
          update(next.key, readErrorFeedback(kind, message));
          // Lo que no quedó guardado se puede volver a escanear.
          if (kind !== "duplicate") sentRef.current.delete(next.code);
          // El backend ya lo tenía y el detalle no: otra sesión escaneó. Se relee.
          if (kind === "duplicate") changed += 1;
          if (kind === "not-pending" || kind === "not-found" || kind === "forbidden") {
            for (const dropped of queueRef.current) {
              sentRef.current.delete(dropped.code);
              update(dropped.key, { tone: "error", title: "No se envió", detail: message });
            }
            queueRef.current = [];
            toast.error(message, { id: `rfid-read-stop-${reconciliationId}` });
            changed += 1; // relee para dejar de ofrecer el escaneo
          }
        }
      }
    } finally {
      runningRef.current = false;
      setPending(0);
      if (changed > 0) void queryClient.invalidateQueries({ queryKey: RFID_RECONCILIATIONS_KEY });
    }
  };

  /** Encola un código leído (lector de mano o antena). */
  const enqueue = (raw: string) => {
    const code = normalizeTag(raw);
    if (!code) return;
    seqRef.current += 1;
    const key = seqRef.current;
    const repeated = knownRef.current.has(code) || sentRef.current.has(code);
    const entry: RfidSessionRead = repeated
      ? { key, code, tone: "warn", title: "Ya leído", detail: "Este código ya está en el encuadre" }
      : { key, code, tone: "pending", title: "Enviando…" };
    setReads((prev) => [entry, ...prev].slice(0, SESSION_READS_LIMIT));
    if (repeated) return;
    sentRef.current.add(code);
    queueRef.current.push({ key, code });
    setPending(queueRef.current.length + (runningRef.current ? 1 : 0));
    void drain();
  };

  return { reads, pending, enqueue };
}
