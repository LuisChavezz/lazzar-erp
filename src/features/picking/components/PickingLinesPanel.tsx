"use client";

import { useRef, useState } from "react";
import { DecimalQuantityInput } from "@/src/components/DecimalQuantityInput";
import { FormInput } from "@/src/components/FormInput";
import { SkuCode } from "@/src/components/SkuCode";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { hasLineCode, splitSku } from "@/src/utils/sku";
import type { PickingOnboardingTalla } from "../interfaces/picking-onboarding.interface";
import type { PickingLineLimits } from "../hooks/usePickingStep2Form";
import { anyScannable, findRowByScan, groupByProduct } from "../utils/pickingScan";

interface PickingLinesPanelProps {
  rows: PickingOnboardingTalla[];
  limits: Record<string, PickingLineLimits>;
  quantities: Record<string, string>;
  observaciones: Record<string, string>;
  setQuantity: (tallaId: number, value: string) => void;
  setObservacion: (tallaId: number, value: string) => void;
}

type Modo = "scanner" | "manual";
type ScanFeedback = { tone: "ok" | "warn" | "error"; title: string; detail?: string; key: number };

const n = (value: string | undefined) => Number.parseFloat(value ?? "") || 0;
const fmt = (value: number) => value.toLocaleString("es-MX", { maximumFractionDigits: 4 });

const codesOf = (row: PickingOnboardingTalla) => ({
  producto_variante_sku: row.producto_variante_sku ?? row.sku_muestra,
  producto_codigo: row.producto_codigo,
  producto_cod_proscai: row.producto_cod_proscai,
});

/**
 * Códigos del producto + color para el encabezado del grupo: el código raíz
 * (modelo), el SKU base modelo/color y el Proscai, para no tener que abrirlo.
 */
const codigosDelGrupo = (rows: readonly PickingOnboardingTalla[]) => {
  const sku = rows.map((r) => r.producto_variante_sku ?? r.sku_muestra).find((v) => v?.trim());
  const parts = splitSku(sku);
  const raiz = rows.find((r) => r.producto_codigo?.trim())?.producto_codigo?.trim() ?? parts?.modelo ?? null;
  const proscai = rows.find((r) => r.producto_cod_proscai?.trim())?.producto_cod_proscai?.trim() ?? null;
  return { raiz, base: parts ? `${parts.modelo} / ${parts.color}` : (sku?.trim() ?? null), proscai };
};

/**
 * Tallas por surtir, agrupadas por producto + color en desplegables, con dos
 * formas de capturar:
 *
 *  - **Escanear** (por defecto): cada lectura del scanner (que teclea el código
 *    y Enter) suma 1 pieza a la talla que coincide y abre su producto. Nunca
 *    pasa del techo de la línea (pendiente acotado por existencia).
 *  - **Manual**: los mismos controles de cantidad de siempre.
 *
 * Los dos modos editan las mismas cantidades: se puede escanear y corregir a
 * mano sin perder nada.
 */
export function PickingLinesPanel({
  rows,
  limits,
  quantities,
  observaciones,
  setQuantity,
  setObservacion,
}: PickingLinesPanelProps) {
  const scannable = anyScannable(rows);
  const [modo, setModo] = useState<Modo>(scannable ? "scanner" : "manual");
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(() => new Set());
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [lecturas, setLecturas] = useState(0);
  // El scanner arranca con un "Iniciar escaneo" explícito: el usuario sabe
  // cuándo el campo está escuchando al lector.
  const [escaneando, setEscaneando] = useState(false);
  const [resaltada, setResaltada] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const feedbackSeq = useRef(0);

  const grupos = groupByProduct(rows);
  const conCodigos = hasLineCode(rows.map(codesOf));
  const maxOf = (row: PickingOnboardingTalla) => limits[String(row.pedido_detalle_talla)]?.max ?? 0;
  const qtyOf = (row: PickingOnboardingTalla) => n(quantities[String(row.pedido_detalle_talla)]);

  const totalCapturado = rows.reduce((acc, r) => acc + qtyOf(r), 0);
  const totalTecho = rows.reduce((acc, r) => acc + maxOf(r), 0);

  const toggleGrupo = (key: string) =>
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const say = (tone: ScanFeedback["tone"], title: string, detail?: string) => {
    feedbackSeq.current += 1;
    setFeedback({ tone, title, detail, key: feedbackSeq.current });
  };

  const procesarLectura = (raw: string) => {
    const leido = raw.trim();
    setCode("");
    if (!leido) return;
    setLecturas((c) => c + 1);
    const row = findRowByScan(rows, leido, (r) => qtyOf(r) < maxOf(r));
    if (!row) {
      say("error", "No está en este pedido", `Código ${leido}`);
      return;
    }
    const key = String(row.pedido_detalle_talla);
    const nombre = `${row.producto_nombre ?? row.producto_variante_nombre ?? "—"} · ${row.talla_nombre ?? ""}`;
    const actual = qtyOf(row);
    const techo = maxOf(row);
    const grupo = grupos.find((g) => g.rows.includes(row));
    if (grupo) setAbiertos((prev) => new Set(prev).add(grupo.key));
    setResaltada(key);
    if (actual + 1 > techo) {
      say("warn", "Talla completa", `${nombre}: ya tienes ${fmt(actual)} de ${fmt(techo)}`);
      return;
    }
    setQuantity(row.pedido_detalle_talla, String(actual + 1));
    say("ok", `+1 ${nombre}`, `${fmt(actual + 1)} de ${fmt(techo)}`);
  };

  const todoCompleto = totalTecho > 0 && totalCapturado >= totalTecho;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
      {/* ── Encabezado: avance total + modo ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tallas por surtir</h3>
          <p className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            <b className={todoCompleto ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"}>
              {fmt(totalCapturado)}
            </b>{" "}
            de {fmt(totalTecho)} pzas que se pueden surtir hoy
          </p>
        </div>
        <div role="radiogroup" aria-label="Forma de captura" className="inline-flex rounded-full bg-slate-100 dark:bg-white/10 p-0.5">
          {(["scanner", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={modo === m}
              onClick={() => {
                setModo(m);
                if (m === "scanner" && escaneando) setTimeout(() => scanRef.current?.focus(), 0);
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
          className={`h-full transition-all duration-300 ${todoCompleto ? "bg-emerald-500" : "bg-sky-500"}`}
          style={{ width: `${totalTecho > 0 ? Math.min(100, (totalCapturado / totalTecho) * 100) : 0}%` }}
        />
      </div>

      {/* ── Scanner ───────────────────────────────────────────────────── */}
      {modo === "scanner" && !escaneando && (
        <div className="flex flex-col items-center gap-3 px-4 py-6 text-center border-b border-slate-100 dark:border-white/5 bg-linear-to-b from-sky-50/70 to-transparent dark:from-sky-500/5">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Surte con el lector</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {scannable
                ? "Cada prenda escaneada suma 1 pieza a su talla. Nunca pasa de lo que se puede surtir."
                : "Las tallas de este pedido todavía no traen código para reconocerlas. Usa Manual mientras tanto."}
            </p>
          </div>
          <button
            type="button"
            disabled={!scannable}
            onClick={() => {
              setEscaneando(true);
              setTimeout(() => scanRef.current?.focus(), 0);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            Iniciar escaneo
          </button>
        </div>
      )}

      {modo === "scanner" && escaneando && (
        <div className="space-y-2 px-4 py-3 border-b border-slate-100 dark:border-white/5">
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
          <label htmlFor="picking-scan" className="sr-only">
            Código escaneado
          </label>
          <input
            id="picking-scan"
            ref={scanRef}
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            // El scanner teclea el código y Enter: Enter procesa la lectura
            // y NUNCA envía el formulario.
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                procesarLectura(code);
              }
            }}
            placeholder="Escanea la etiqueta de la prenda…"
            className="h-12 w-full rounded-xl border-2 border-dashed border-sky-300 dark:border-sky-500/40 bg-sky-50/40 dark:bg-sky-500/5 px-4 font-mono text-base font-semibold tracking-wider text-slate-900 dark:text-white placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-solid focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
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

      {/* ── Productos (desplegables) ──────────────────────────────────── */}
      <ul className="max-h-[42vh] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
        {grupos.map((grupo) => {
          const abierto = abiertos.has(grupo.key) || (modo === "manual" && grupos.length === 1);
          const capturado = grupo.rows.reduce((acc, r) => acc + qtyOf(r), 0);
          const techo = grupo.rows.reduce((acc, r) => acc + maxOf(r), 0);
          const completo = techo > 0 && capturado >= techo;
          const sinCupo = techo <= 0;
          const codigos = codigosDelGrupo(grupo.rows);
          return (
            <li key={grupo.key}>
              <button
                type="button"
                onClick={() => toggleGrupo(grupo.key)}
                aria-expanded={abierto}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 ${
                  sinCupo ? "opacity-50" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    completo ? "bg-emerald-500" : capturado > 0 ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    {codigos.base && (
                      <span
                        className="shrink-0 rounded-md bg-slate-900 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide text-white"
                        title="SKU: modelo / color"
                      >
                        {codigos.base}
                      </span>
                    )}
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{grupo.nombre}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {codigos.raiz && (
                      <span>
                        Raíz <b className="font-mono text-slate-700 dark:text-slate-200">{codigos.raiz}</b>
                      </span>
                    )}
                    {codigos.proscai && (
                      <span>
                        Proscai <b className="font-mono text-slate-700 dark:text-slate-200">{codigos.proscai}</b>
                      </span>
                    )}
                    {grupo.color && <span>{grupo.color}</span>}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {grupo.rows.map((r) => {
                      const q = qtyOf(r);
                      const m = maxOf(r);
                      const lleno = m > 0 && q >= m;
                      return (
                        <span
                          key={r.pedido_detalle_talla}
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                            lleno
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : q > 0
                                ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
                                : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                          }`}
                        >
                          {r.talla_nombre ?? "—"} <span className="font-normal opacity-80">{fmt(q)}/{fmt(m)}</span>
                        </span>
                      );
                    })}
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className={`block text-sm font-bold ${completo ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"}`}>
                    {fmt(capturado)}
                    <span className="font-normal text-slate-400"> / {fmt(techo)}</span>
                  </span>
                </span>
                <span aria-hidden="true" className={`text-slate-400 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {abierto && (
                <ul className="bg-slate-50/50 dark:bg-white/2 divide-y divide-slate-100 dark:divide-white/5">
                  {grupo.rows.map((row) => {
                    const key = String(row.pedido_detalle_talla);
                    const { disponible, max, limitedByStock, sharedPool } = limits[key] ?? {
                      disponible: null,
                      max: 0,
                      limitedByStock: false,
                      sharedPool: false,
                    };
                    const qtyValue = quantities[key] ?? "";
                    const qty = n(qtyValue);
                    const lleno = max > 0 && qty >= max;
                    return (
                      <li
                        key={key}
                        className={`px-4 py-2 pl-9 transition-colors duration-500 ${max <= 0 ? "opacity-50" : ""} ${
                          resaltada === key ? "bg-sky-100/70 dark:bg-sky-500/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {conCodigos && (
                            <div className="w-28 shrink-0 text-xs">
                              <SkuCode linea={codesOf(row)} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                                {row.talla_nombre ?? "—"}
                              </span>
                              {row.es_muestra && (
                                <span className="rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                                  Muestra
                                </span>
                              )}
                              {lleno && <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">✓ completa</span>}
                            </p>
                            <p
                              className="mt-0.5 text-[11px] tabular-nums text-slate-500 dark:text-slate-400"
                              title={`Pedida ${formatExactQuantityValue(row.cantidad_pedida)} · Asignada ${formatExactQuantityValue(row.cantidad_ya_asignada)}`}
                            >
                              Pendiente <b className="text-slate-700 dark:text-slate-200">{formatExactQuantityValue(row.cantidad_pendiente)}</b>
                              {disponible !== null && (
                                <span className={limitedByStock ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
                                  {" · "}Disponible {formatExactQuantityValue(row.existencia_disponible)}
                                  {sharedPool && " (compartido)"}
                                </span>
                              )}
                            </p>
                          </div>
                          {max > 0 && !lleno && (
                            <button
                              type="button"
                              onClick={() => setQuantity(row.pedido_detalle_talla, String(max))}
                              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 cursor-pointer"
                            >
                              Todo ({fmt(max)})
                            </button>
                          )}
                          <DecimalQuantityInput
                            value={qtyValue}
                            max={max}
                            disabled={max <= 0}
                            onChange={(next) => setQuantity(row.pedido_detalle_talla, next)}
                            label={`Cantidad a surtir de ${grupo.nombre} talla ${row.talla_nombre ?? ""}`}
                          />
                        </div>
                        {qty > 0 && modo === "manual" && (
                          <div className="mt-1.5">
                            <FormInput
                              variant="compact"
                              placeholder="Nota de esta talla (opcional)"
                              forceUppercase
                              value={observaciones[key] ?? ""}
                              onChange={(event) => setObservacion(row.pedido_detalle_talla, event.target.value)}
                              aria-label={`Observaciones de ${grupo.nombre} talla ${row.talla_nombre ?? ""}`}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
