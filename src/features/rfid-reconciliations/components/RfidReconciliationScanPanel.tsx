"use client";

import { useState } from "react";
import { useRfidEpcFeed } from "@/src/features/rfid-scanner/hooks/useRfidEpcFeed";
import { useIsSuperuser } from "@/src/features/users/hooks/useIsSuperuser";
import { useSessionCompany } from "@/src/features/workspace/hooks/useSessionCompany";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { useRfidReadQueue, type RfidSessionRead } from "../hooks/useRfidReadQueue";
import type { RfidReadTone } from "../utils/rfidReadResult";

interface RfidReconciliationScanPanelProps {
  reconciliationId: number;
  /** EPC normalizados que el encuadre ya tiene (`knownReadEpcs` del detalle). */
  knownEpcs: ReadonlySet<string>;
  totalLeido: string;
  totalEsperado: string;
}

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
 */
export function RfidReconciliationScanPanel({
  reconciliationId,
  knownEpcs,
  totalLeido,
  totalEsperado,
}: RfidReconciliationScanPanelProps) {
  const { reads, pending, enqueue } = useRfidReadQueue({ reconciliationId, knownEpcs });
  const [reading, setReading] = useState(false);
  const hasNoCompany = useSessionCompany().status === "none";
  const isSuperuser = useIsSuperuser();
  const { count, isError } = useRfidEpcFeed(reading && !hasNoCompany, (scan) => enqueue(scan.epc), null, {
    cursor: true,
  });

  return (
    <section aria-label="Lectura RFID" className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Leer etiquetas con la antena RFID</h3>
          <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            <b className="text-slate-800 dark:text-slate-100">{formatExactQuantityValue(totalLeido)}</b> leídas de{" "}
            {formatExactQuantityValue(totalEsperado)} esperadas
            {pending > 0 && <> · enviando {pending}</>}
          </p>
        </div>
        {reading ? (
          <button
            type="button"
            onClick={() => setReading(false)}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            Pausar
          </button>
        ) : (
          <button
            type="button"
            disabled={hasNoCompany}
            onClick={() => setReading(true)}
            className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            Iniciar lectura
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-2 text-[11.5px] border-b border-slate-100 dark:border-white/5">
        {reading && !hasNoCompany && (
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
            : !reading
              ? "Coloca las prendas frente a la antena e inicia la lectura."
              : isError
                ? <span className="text-rose-600 dark:text-rose-400">Sin respuesta del lector RFID.</span>
                : count === 0
                  ? "Esperando etiquetas frente a la antena…"
                  : `${count} ${count === 1 ? "etiqueta detectada" : "etiquetas detectadas"} en esta lectura.`}
        </span>
      </div>

      {reading && !hasNoCompany && (
        <p className="px-4 py-1.5 text-[11px] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/5">
          Las prendas que ya estaban frente a la antena al iniciar pueden tardar hasta 30 s en aparecer.
        </p>
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
