"use client";

import { useEffect, useRef } from "react";
import { useRfidEpcFeed } from "@/src/features/rfid-scanner/hooks/useRfidEpcFeed";
import {
  useLectorEnUso,
  useRfidLectorSeleccionado,
} from "@/src/features/rfid-scanner/hooks/useRfidLectorSeleccionado";
import { RfidLectorSelect } from "@/src/features/rfid-scanner/components/RfidLectorSelect";
import { rfidLectorListo } from "@/src/features/rfid-scanner/utils/rfidLectorListo";
import { useIsSuperuser } from "@/src/features/users/hooks/useIsSuperuser";
import { useSessionCompany } from "@/src/features/workspace/hooks/useSessionCompany";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { useRfidReadQueue, type RfidReadTally, type RfidSessionRead } from "../hooks/useRfidReadQueue";
import type { RfidReadTone } from "../utils/rfidReadResult";

interface RfidReconciliationScanPanelProps {
  reconciliationId: number;
  /** EPC normalizados que el encuadre ya tiene (`knownReadEpcs` del detalle). */
  knownEpcs: ReadonlySet<string>;
  /** Lo leído que sumó a un renglón (sin las lecturas sin asignar) y lo esperado. */
  leidoAsignado: number;
  esperado: number;
  /** Si la antena está leyendo: lo controla el detalle, que no deja aceptar mientras tanto. */
  reading: boolean;
  onReadingChange: (reading: boolean) => void;
  /**
   * Lecturas por enviar (incluida la que está en vuelo) más un sondeo de la
   * antena aún en vuelo, que puede traer lecturas aunque ya se haya pausado;
   * 0 al desmontarse.
   */
  onPendingChange: (pending: number) => void;
  /** La cola se detuvo (`400 estatus`, `404`, `403`): el detalle apaga la lectura. */
  onQueueStopped: () => void;
  /** Cómo se nombra el encuadre en el aviso "en uso" del lector. */
  documento: string;
}

/** Pantalla con la que se recuerda el lector elegido y se avisa "en uso" (#566). */
const PANTALLA = "Encuadre";

const TONE: Record<RfidReadTone, { dot: string; text: string }> = {
  pending: { dot: "bg-slate-300 dark:bg-slate-500 animate-pulse", text: "text-slate-500 dark:text-slate-400" },
  ok: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  warn: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  error: { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
};

/**
 * Lectura de un encuadre PENDIENTE, SOLO con la antena RFID (EC-961). Sin
 * lector de mano ni captura manual: el código de barras de la etiqueta es el
 * SKU, igual en todas las piezas, y el encuadre cuenta un `codigo_tag` una sola
 * vez, así que con él solo contaría una pieza por SKU.
 *
 * La antena (`useRfidEpcFeed` con `cursor`: solo lo leído DESPUÉS de iniciar,
 * una vez por EPC) entrega cada etiqueta y su EPC va tal cual a la cola
 * (`useRfidReadQueue`, `{epc}`, EC-982): el backend la resuelve por la etiqueta
 * impresa y la asigna al renglón. La cola envía una a la vez y pinta el
 * resultado de cada una en la lista de la sesión. Arranque explícito, como en
 * recepciones: la antena solo se sondea mientras se lee.
 *
 * La lectura y lo pendiente los conoce el detalle (`reading`, `onPendingChange`):
 * "Aceptar" espera a que la lectura esté en pausa y la cola vacía. Si la cola
 * se detiene (el encuadre ya no está pendiente) la antena deja de sondearse.
 *
 * Lector: como Recepción y Surtido (#566), se elige con qué lector se lee
 * (`?lector=`, recordado por pantalla) y mientras se lee se avisa "en uso". Con
 * varios lectores no se lee hasta elegir uno: leer de todos mezclaría cajones.
 */
export function RfidReconciliationScanPanel({
  reconciliationId,
  knownEpcs,
  leidoAsignado,
  esperado,
  reading,
  onReadingChange,
  onPendingChange,
  onQueueStopped,
  documento,
}: RfidReconciliationScanPanelProps) {
  const { reads, pending, stopped, tally, rejected, enqueue } = useRfidReadQueue({ reconciliationId, knownEpcs });
  const hasNoCompany = useSessionCompany().status === "none";
  const isSuperuser = useIsSuperuser();
  const { lectores, lectorId, seleccionar, catalogoResuelto, catalogoFallido } = useRfidLectorSeleccionado(PANTALLA);
  const faltaLector = lectores.length > 1 && lectorId === null;
  // Nada se pide hasta que el catálogo responda (`rfidLectorListo`).
  const active =
    reading &&
    !hasNoCompany &&
    !stopped &&
    rfidLectorListo({ catalogoResuelto, lectores: lectores.length, lectorId });
  const { count, isError, isPolling } = useRfidEpcFeed(active, (scan) => enqueue(scan.epc), lectorId, {
    cursor: true,
  });
  useLectorEnUso(lectorId, active, PANTALLA, documento);
  // Un sondeo en vuelo cuenta como pendiente: sus lecturas llegan aunque ya se pausó.
  const busy = pending + (isPolling ? 1 : 0);

  useEffect(() => {
    onPendingChange(busy);
    return () => onPendingChange(0);
  }, [busy, onPendingChange]);

  // Cola detenida: el detalle apaga la lectura (si no, "Aceptar" pediría pausar
  // sin botón de pausa). Una vez por montaje: la cola no se reanuda.
  const onQueueStoppedRef = useRef(onQueueStopped);
  useEffect(() => {
    onQueueStoppedRef.current = onQueueStopped;
  });
  useEffect(() => {
    if (stopped) onQueueStoppedRef.current();
  }, [stopped]);

  return (
    <section aria-label="Lectura RFID" className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Leer etiquetas con la antena RFID</h3>
          <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            <b className="text-slate-800 dark:text-slate-100">{formatExactQuantityValue(leidoAsignado)}</b> asignadas de{" "}
            {formatExactQuantityValue(esperado)} esperadas
            {pending > 0 && <> · enviando {pending}</>}
          </p>
        </div>
        {!hasNoCompany && <RfidLectorSelect lectores={lectores} value={lectorId} onChange={seleccionar} />}
        {reading && !stopped ? (
          <button
            type="button"
            onClick={() => onReadingChange(false)}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            Pausar
          </button>
        ) : (
          <button
            type="button"
            disabled={hasNoCompany || stopped || faltaLector}
            onClick={() => onReadingChange(true)}
            className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            Iniciar lectura
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-2 text-[11.5px] border-b border-slate-100 dark:border-white/5">
        {active && (
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
          </span>
        )}
        <span role="status" className="text-slate-500 dark:text-slate-400">
          {hasNoCompany
            ? isSuperuser
              ? "Sin empresa activa: elígela desde “Sin empresa activa”, en el encabezado, para leer con la antena."
              : "Tu usuario no tiene una empresa asignada: no se puede leer con la antena."
            : faltaLector
              ? <span className="text-amber-600 dark:text-amber-400">Selecciona con qué lector leer.</span>
              : !reading || stopped
              ? "Coloca las prendas frente a la antena e inicia la lectura."
              : isError || catalogoFallido
                ? <span className="text-rose-600 dark:text-rose-400">Sin respuesta del lector RFID.</span>
                : count === 0
                  ? "Esperando etiquetas frente a la antena…"
                  : `${count} ${count === 1 ? "etiqueta detectada" : "etiquetas detectadas"} en esta lectura.`}
        </span>
      </div>

      {active && (
        <p className="px-4 py-1.5 text-[11px] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/5">
          Las prendas que ya estaban frente a la antena al iniciar pueden tardar hasta 30 s en aparecer.
        </p>
      )}

      <SessionTally tally={tally} />

      {rejected.length > 0 && (
        <div className="border-b border-slate-100 dark:border-white/5">
          <p className="px-4 pt-2 text-[11px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
            No registradas ({rejected.length})
          </p>
          <ul aria-label="Lecturas no registradas" className="max-h-40 overflow-y-auto px-2 py-1.5">
            {rejected.map((read) => (
              <li key={read.key} className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-[11.5px]" title={read.message}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
                <span className="shrink-0 font-mono text-slate-700 dark:text-slate-200">{read.code}</span>
                <span className="min-w-0 flex-1 truncate text-rose-700 dark:text-rose-300">{read.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reads.length === 0 ? (
        <p className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">Aún no hay lecturas en esta sesión.</p>
      ) : (
        <ul aria-label="Lecturas de esta sesión" aria-live="polite" className="max-h-48 overflow-y-auto px-2 py-2">
          {reads.map((read) => (
            <SessionReadRow key={read.key} read={read} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Totales de la sesión por resultado. No se recortan como la lista de las
 * últimas 50: con una tarima completa siguen diciendo cuántas no entraron.
 */
function SessionTally({ tally }: { tally: RfidReadTally }) {
  const total = tally.enviadas + tally.yaLeidas + tally.rechazadas;
  if (total === 0) return null;
  const items: { label: string; value: number; className: string }[] = [
    { label: "Enviadas", value: tally.enviadas, className: "text-slate-800 dark:text-slate-100" },
    { label: "Sin asignar", value: tally.sinAsignar, className: "text-amber-600 dark:text-amber-400" },
    { label: "Ya leídas", value: tally.yaLeidas, className: "text-slate-600 dark:text-slate-300" },
    { label: "No registradas", value: tally.rechazadas, className: "text-rose-600 dark:text-rose-400" },
  ];
  return (
    <dl aria-label="Totales de esta sesión" className="flex flex-wrap gap-x-5 gap-y-1 px-4 py-2 text-[11.5px] border-b border-slate-100 dark:border-white/5">
      {items.map((item) => (
        <div key={item.label} className="flex gap-1.5">
          <dt className="text-slate-500 dark:text-slate-400">{item.label}:</dt>
          <dd className={`tabular-nums font-semibold ${item.className}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SessionReadRow({ read }: { read: RfidSessionRead }) {
  const tone = TONE[read.tone];
  return (
    <li
      className="flex items-center gap-2.5 rounded-lg px-2 py-1 text-[11.5px] hover:bg-slate-50 dark:hover:bg-white/[0.03]"
      title={read.detail}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-mono text-slate-700 dark:text-slate-200">{read.code}</span>
      <span className="hidden sm:block min-w-0 max-w-56 truncate text-slate-500 dark:text-slate-400">{read.detail}</span>
      <span className={`w-36 shrink-0 truncate text-right font-medium ${tone.text}`}>{read.title}</span>
    </li>
  );
}
