"use client";

import { useRef, useState, type ReactNode } from "react";

export type ScanModo = "scanner" | "manual";

/** Resultado de procesar una lectura: se muestra bajo el campo del lector. */
export interface ScanResult {
  tone: "ok" | "warn" | "error";
  title: string;
  detail?: string;
}

interface ScanCaptureProps {
  /** "Tallas por surtir", "Piezas por recibir". */
  title: string;
  captured: number;
  total: number;
  /** Texto tras "N de M": "pzas que se pueden surtir hoy". */
  totalLabel: string;
  modo: ScanModo;
  onModoChange: (modo: ScanModo) => void;
  /** ¿Alguna línea trae código? Sin códigos el lector no sirve. */
  scannable: boolean;
  heroTitle: string;
  heroText: string;
  unscannableText: string;
  placeholder: string;
  inputId: string;
  /** Procesa UNA lectura (el lector teclea el código y Enter). */
  onScan: (code: string) => ScanResult;
  /** Captura en vivo extra (p. ej. la antena RFID), visible solo mientras se
   *  escanea: al pausar se desmonta y deja de sondear. */
  liveFeed?: ReactNode;
  /** Acciones extra del encabezado (p. ej. "Recibir todo"). */
  actions?: ReactNode;
}

const fmt = (value: number) => value.toLocaleString("es-MX", { maximumFractionDigits: 4 });

/**
 * Encabezado de captura por lector, compartido por Surtido y Recepción: avance
 * total, selector Escanear / Manual, tarjeta "Iniciar escaneo" y, ya
 * escaneando, el campo que escucha al lector con el aviso de cada lectura.
 * La lista de líneas va debajo y la pinta cada flujo.
 */
export function ScanCapture({
  title,
  captured,
  total,
  totalLabel,
  modo,
  onModoChange,
  scannable,
  heroTitle,
  heroText,
  unscannableText,
  placeholder,
  inputId,
  onScan,
  liveFeed,
  actions,
}: ScanCaptureProps) {
  // El lector arranca con un "Iniciar escaneo" explícito: el usuario sabe
  // cuándo el campo está escuchando.
  const [escaneando, setEscaneando] = useState(false);
  const [code, setCode] = useState("");
  const [lecturas, setLecturas] = useState(0);
  const [feedback, setFeedback] = useState<(ScanResult & { key: number }) | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const focusScan = () => setTimeout(() => scanRef.current?.focus(), 0);

  const procesar = (raw: string) => {
    const leido = raw.trim();
    setCode("");
    if (!leido) return;
    setLecturas((c) => c + 1);
    seq.current += 1;
    setFeedback({ ...onScan(leido), key: seq.current });
  };

  const completo = total > 0 && captured >= total;

  return (
    <>
      {/* ── Encabezado: avance total + modo ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            <b className={completo ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"}>
              {fmt(captured)}
            </b>{" "}
            de {fmt(total)} {totalLabel}
          </p>
        </div>
        {actions}
        <div role="radiogroup" aria-label="Forma de captura" className="inline-flex rounded-full bg-slate-100 dark:bg-white/10 p-0.5">
          {(["scanner", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={modo === m}
              onClick={() => {
                onModoChange(m);
                if (m === "scanner" && escaneando) focusScan();
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                modo === m
                  ? "bg-white dark:bg-zinc-800 text-sky-700 dark:text-sky-300 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {m === "scanner" ? "Escanear" : "Manual"}
            </button>
          ))}
        </div>
      </div>
      <div className="h-1 w-full bg-slate-100 dark:bg-white/5">
        <div
          className={`h-full transition-all duration-300 ${completo ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${total > 0 ? Math.min(100, (captured / total) * 100) : 0}%` }}
        />
      </div>

      {/* ── Lector: tarjeta de inicio ─────────────────────────────────── */}
      {modo === "scanner" && !escaneando && (
        <div className="flex flex-col items-center gap-3 px-4 py-6 text-center border-b border-slate-100 dark:border-white/5 bg-linear-to-b from-sky-50/70 to-transparent dark:from-sky-500/5">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{heroTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{scannable ? heroText : unscannableText}</p>
          </div>
          <button
            type="button"
            disabled={!scannable}
            onClick={() => {
              setEscaneando(true);
              focusScan();
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            Iniciar escaneo
          </button>
        </div>
      )}

      {/* ── Lector: escuchando ────────────────────────────────────────── */}
      {modo === "scanner" && escaneando && (
        <div className="space-y-2 px-4 py-2.5 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Escaneando · {lecturas} {lecturas === 1 ? "lectura" : "lecturas"}
            </span>
            <button
              type="button"
              onClick={() => setEscaneando(false)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              Pausar
            </button>
          </div>
          <label htmlFor={inputId} className="sr-only">
            Código escaneado
          </label>
          <input
            id={inputId}
            ref={scanRef}
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            // El lector teclea el código y Enter: Enter procesa la lectura y
            // NUNCA envía el formulario.
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                procesar(code);
              }
            }}
            placeholder={placeholder}
            className="h-10 w-full rounded-xl border-2 border-dashed border-sky-300 dark:border-sky-500/40 bg-sky-50/40 dark:bg-sky-500/5 px-4 font-mono text-sm font-semibold tracking-wider text-slate-900 dark:text-white placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-solid focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
          {feedback && (
            <p
              key={feedback.key}
              role="status"
              aria-live="polite"
              className={`rounded-lg px-3 py-2 text-xs ${
                feedback.tone === "ok"
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : feedback.tone === "warn"
                    ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                    : "bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-200"
              }`}
            >
              <b>{feedback.title}</b>
              {feedback.detail && <span className="opacity-80"> · {feedback.detail}</span>}
            </p>
          )}
        </div>
      )}
      {modo === "scanner" && escaneando && liveFeed}
    </>
  );
}

/** Chip "CH 3/5" de una talla (gris → azul con avance → verde completa). */
export function SizeProgressChip({ label, captured, total }: { label: string; captured: number; total: number }) {
  const lleno = total > 0 && captured >= total;
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
        lleno
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : captured > 0
            ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
            : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
      }`}
    >
      {label} <span className="font-normal opacity-80">{fmt(captured)}/{fmt(total)}</span>
    </span>
  );
}
