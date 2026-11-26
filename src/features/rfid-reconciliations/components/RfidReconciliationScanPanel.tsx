"use client";

import { useRef, useState } from "react";
import { FormToggle } from "@/src/components/FormToggle";
import { useRfidEpcFeed } from "@/src/features/rfid-scanner/hooks/useRfidEpcFeed";
import { useSessionCompany } from "@/src/features/workspace/hooks/useSessionCompany";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { useRfidReadQueue, type RfidSessionRead } from "../hooks/useRfidReadQueue";
import type { RfidReadTone } from "../utils/rfidReadResult";

interface RfidReconciliationScanPanelProps {
  reconciliationId: number;
  /** Los `codigo_tag` que el encuadre ya tiene (del detalle). */
  knownTags: ReadonlySet<string>;
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
 * Escaneo de un encuadre PENDIENTE. Mismo arranque explícito y mismo campo que
 * escucha al lector de mano que la captura de recepciones (`ScanCapture`): el
 * lector teclea el código y Enter. No reutiliza `ScanCapture` porque esa
 * captura es síncrona y cuenta contra renglones en memoria; aquí cada lectura
 * la decide el backend, así que el resultado llega después y se pinta en la
 * lista de la sesión.
 *
 * La antena RFID entra por la misma cola (`useRfidEpcFeed`, una vez por EPC),
 * con el código de su etiqueta, como en la recepción. Hoy ese código es el SKU:
 * el encuadre cuenta un `codigo_tag` una sola vez, así que una segunda pieza
 * del mismo SKU sale "Ya leído".
 */
export function RfidReconciliationScanPanel({
  reconciliationId,
  knownTags,
  totalLeido,
  totalEsperado,
}: RfidReconciliationScanPanelProps) {
  const { reads, pending, enqueue } = useRfidReadQueue({ reconciliationId, knownTags });
  const [scanning, setScanning] = useState(false);
  const [antenna, setAntenna] = useState(false);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasCompany = useSessionCompany().status !== "none";
  const { isError: antennaError } = useRfidEpcFeed(scanning && antenna && hasCompany, (scan) =>
    enqueue(scan.barcode_value || scan.sku || ""),
  );

  const inputId = `rfid-reconciliation-scan-${reconciliationId}`;
  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 0);

  return (
    <section
      aria-label="Escaneo"
      className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden"
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Escanear etiquetas</h3>
          <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            <b className="text-slate-800 dark:text-slate-100">{formatExactQuantityValue(totalLeido)}</b> leídas de{" "}
            {formatExactQuantityValue(totalEsperado)} esperadas
            {pending > 0 && <> · enviando {pending}</>}
          </p>
        </div>
        {scanning ? (
          <button
            type="button"
            onClick={() => setScanning(false)}
            className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setScanning(true);
              focusInput();
            }}
            className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer"
          >
            Iniciar escaneo
          </button>
        )}
      </div>

      {scanning && (
        <div className="space-y-2 px-4 py-2.5 border-b border-slate-100 dark:border-white/5">
          <label htmlFor={inputId} className="sr-only">
            Código escaneado
          </label>
          <input
            id={inputId}
            ref={inputRef}
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                enqueue(code);
                setCode("");
              }
            }}
            placeholder="Escanea o escribe el código de la etiqueta y presiona Enter"
            className="h-10 w-full rounded-xl border-2 border-dashed border-sky-300 dark:border-sky-500/40 bg-sky-50/40 dark:bg-sky-500/5 px-4 font-mono text-sm font-semibold tracking-wider text-slate-900 dark:text-white placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-solid focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
          <FormToggle
            id={`${inputId}-antenna`}
            description="Sumar también lo que lea la antena RFID"
            checked={antenna}
            disabled={!hasCompany}
            onChange={(event) => setAntenna(event.target.checked)}
          />
          {antenna && (
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
              {antennaError ? (
                <span className="text-rose-600 dark:text-rose-400">Antena RFID: sin respuesta del lector</span>
              ) : (
                "Antena RFID: esperando etiquetas frente a la antena…"
              )}
            </p>
          )}
        </div>
      )}

      {reads.length === 0 ? (
        <p className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
          {scanning ? "Aún no hay lecturas en esta sesión." : "Inicia el escaneo para registrar lecturas."}
        </p>
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
      <span className="hidden sm:block min-w-0 max-w-56 truncate text-slate-500 dark:text-slate-400">
        {read.detail}
      </span>
      <span className={`w-36 shrink-0 truncate text-right font-medium ${tone.text}`}>{read.title}</span>
    </li>
  );
}
