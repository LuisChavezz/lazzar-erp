"use client";

import { useState, type ReactNode } from "react";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { ScanCapture, SizeProgressChip, type ScanModo, type ScanResult } from "@/src/components/ScanCapture";
import { SkuCode } from "@/src/components/SkuCode";
import { splitSku } from "@/src/utils/sku";
import { capturaManualRecepcion, sumarCantidades } from "../utils/receiptQuantities";
import { findReceiptLineByScan, groupReceiptLines, receiptScanCodes, type ReceiptScanLine } from "../utils/receiptScan";

interface ReceiptLinesPanelProps {
  lines: ReceiptScanLine[];
  /** Cantidades capturadas por id de renglón (texto, como las guarda el form). */
  cantidades: Record<string, string>;
  setCantidad: (lineId: number, value: string) => void;
  /** Avisos bajo el encabezado (SM, error de "al menos una"). */
  notice?: ReactNode;
  /** 400 del backend por id de renglón (EC-919): su grupo se abre y el renglón lo dice. */
  lineErrors?: Record<number, string>;
}

const fmt = (value: number) => value.toLocaleString("es-MX", { maximumFractionDigits: 4 });

/**
 * "En maquila 4 (SM-00005)": piezas del renglón que están fuera con un
 * maquilero. No cuentan en lo pendiente de la OP: se reciben con su SM.
 */
const enMaquilaTexto = (line: ReceiptScanLine) =>
  `En maquila ${fmt(line.enMaquila)}${line.enMaquilaFolios.length > 0 ? ` (${line.enMaquilaFolios.join(", ")})` : ""}`;

/** Talla visible: la del renglón o, si falta, la que trae el SKU. */
const tallaDe = (line: ReceiptScanLine) => line.talla?.trim() || splitSku(line.sku)?.talla || null;

/**
 * Códigos del grupo para reconocerlo sin abrirlo: SKU base modelo / color, el
 * código raíz y el Proscai (nucleo-erp #1285).
 */
const codigosDelGrupo = (lines: readonly ReceiptScanLine[]) => {
  const sku = lines.map((l) => l.sku).find((s) => s?.trim());
  const parts = splitSku(sku);
  return {
    base: parts ? `${parts.modelo} / ${parts.color}` : null,
    raiz: lines.find((l) => l.codigo)?.codigo ?? parts?.modelo ?? null,
    proscai: lines.find((l) => l.proscai)?.proscai ?? null,
  };
};

/**
 * Piezas por recibir, agrupadas por producto + color en desplegables, con dos
 * formas de capturar (mismo patrón que el surtido):
 *
 *  - **Escanear** (por defecto): cada etiqueta leída suma 1 pieza a su
 *    renglón y abre su producto. Nunca pasa de lo pendiente.
 *  - **Manual**: el mismo selector de cantidad de siempre, solo enteros.
 *
 * Los dos modos editan las mismas cantidades del formulario. "Todo" y "Recibir
 * todo" mandan lo pendiente EXACTO (EC-900): un pendiente fraccionario (0.5 o
 * 10.5) se recibe completo sin teclearlo, y un renglón con menos de una pieza
 * pendiente se recibe solo así.
 */
export function ReceiptLinesPanel({ lines, cantidades, setCantidad, notice, lineErrors = {} }: ReceiptLinesPanelProps) {
  const recibibles = lines.filter((l) => l.tope > 0);
  const noRecibibles = lines.filter((l) => l.tope <= 0);
  const scannable = recibibles.some((l) => receiptScanCodes(l).length > 0);
  const [modo, setModo] = useState<ScanModo>(scannable ? "scanner" : "manual");
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(() => new Set());
  const [resaltada, setResaltada] = useState<number | null>(null);

  const qtyOf = (line: ReceiptScanLine) => Math.min(Number(cantidades[String(line.id)]) || 0, line.tope);
  const grupos = groupReceiptLines(recibibles);
  const totalCapturado = sumarCantidades(recibibles.map(qtyOf));
  const totalTecho = sumarCantidades(recibibles.map((l) => l.tope));

  const toggleGrupo = (key: string) =>
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const llenarTodo = (todo: boolean) => recibibles.forEach((l) => setCantidad(l.id, todo ? String(l.tope) : "0"));

  const procesarLectura = (leido: string): ScanResult => {
    // Con cupo = cabe una pieza más (un renglón con 0.5 por recibir no la tiene).
    const line = findReceiptLineByScan(lines, leido, (l) => qtyOf(l) + 1 <= l.tope);
    if (!line) return { tone: "error", title: "No está en esta orden", detail: `Código ${leido}` };
    const talla = tallaDe(line);
    const nombre = `${line.nombre}${talla ? ` · ${talla}` : ""}`;
    if (line.tope <= 0) return { tone: "warn", title: line.sinTope ?? "Sin pendiente", detail: nombre };
    const grupo = grupos.find((g) => g.lines.includes(line));
    if (grupo) setAbiertos((prev) => new Set(prev).add(grupo.key));
    setResaltada(line.id);
    const actual = qtyOf(line);
    if (actual + 1 > line.tope) {
      // Queda menos de una pieza (pendiente fraccionario): una etiqueta no cabe.
      return actual < line.tope
        ? {
            tone: "warn",
            title: "Falta menos de una pieza",
            detail: `${nombre}: ${fmt(actual)} de ${fmt(line.tope)}. Usa "Todo" para recibir el resto.`,
          }
        : { tone: "warn", title: "Ya está completo", detail: `${nombre}: ${fmt(actual)} de ${fmt(line.tope)}` };
    }
    setCantidad(line.id, String(actual + 1));
    return { tone: "ok", title: `+1 ${nombre}`, detail: `${fmt(actual + 1)} de ${fmt(line.tope)}` };
  };

  return (
    <div>
      <ScanCapture
        title="Piezas por recibir"
        captured={totalCapturado}
        total={totalTecho}
        totalLabel="pzas pendientes"
        modo={modo}
        onModoChange={setModo}
        scannable={scannable}
        heroTitle="Recibe con el lector"
        heroText="Cada etiqueta escaneada suma 1 pieza a su producto. Nunca pasa de lo pendiente."
        unscannableText="Los productos de esta orden no traen SKU ni código para reconocerlos. Usa Manual."
        placeholder="Escanea la etiqueta de la prenda…"
        inputId="receipt-scan"
        onScan={procesarLectura}
        actions={
          recibibles.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => llenarTodo(true)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
              >
                Recibir todo
              </button>
              {totalCapturado > 0 && (
                <button
                  type="button"
                  onClick={() => llenarTodo(false)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          )
        }
      />
      {notice && <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5">{notice}</div>}

      <ul className="max-h-[42vh] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
        {grupos.map((grupo) => {
          const conError = grupo.lines.some((l) => lineErrors[l.id] !== undefined);
          const abierto = conError || abiertos.has(grupo.key) || (modo === "manual" && grupos.length <= 3);
          const capturado = sumarCantidades(grupo.lines.map(qtyOf));
          const techo = sumarCantidades(grupo.lines.map((l) => l.tope));
          const completo = techo > 0 && capturado >= techo;
          const { base, raiz, proscai } = codigosDelGrupo(grupo.lines);
          return (
            <li key={grupo.key}>
              <button
                type="button"
                onClick={() => toggleGrupo(grupo.key)}
                aria-expanded={abierto}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    completo ? "bg-emerald-500" : capturado > 0 ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    {base && (
                      <span
                        className="shrink-0 rounded-md bg-slate-900 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide text-white"
                        title="SKU: modelo / color"
                      >
                        {base}
                      </span>
                    )}
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{grupo.nombre}</span>
                  </span>
                  {(raiz || proscai || grupo.color) && (
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {raiz && (
                        <span>
                          Raíz <b className="font-mono text-slate-700 dark:text-slate-200">{raiz}</b>
                        </span>
                      )}
                      {proscai && (
                        <span>
                          Proscai <b className="font-mono text-slate-700 dark:text-slate-200">{proscai}</b>
                        </span>
                      )}
                      {grupo.color && <span>{grupo.color}</span>}
                    </span>
                  )}
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {grupo.lines.map((l) => (
                      <SizeProgressChip key={l.id} label={tallaDe(l) ?? "Pzas"} captured={qtyOf(l)} total={l.tope} />
                    ))}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-sm font-bold tabular-nums ${
                    completo ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {fmt(capturado)}
                  <span className="font-normal text-slate-400"> / {fmt(techo)}</span>
                </span>
                <span aria-hidden="true" className={`text-slate-400 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {abierto && (
                <ul className="bg-slate-50/50 dark:bg-white/2 divide-y divide-slate-100 dark:divide-white/5">
                  {grupo.lines.map((line) => {
                    const qty = qtyOf(line);
                    const lleno = qty >= line.tope;
                    const talla = tallaDe(line);
                    const error = lineErrors[line.id];
                    return (
                      <li
                        key={line.id}
                        data-line-error={error !== undefined || undefined}
                        className={`flex items-center gap-3 px-4 py-2 pl-9 transition-colors duration-500 ${
                          error !== undefined
                            ? "bg-red-50/70 dark:bg-red-500/10"
                            : resaltada === line.id
                              ? "bg-sky-100/70 dark:bg-sky-500/10"
                              : ""
                        }`}
                      >
                        {(line.sku || line.codigo || line.proscai) && (
                          <div className="w-28 shrink-0 text-xs">
                            <SkuCode
                              linea={{
                                producto_variante_sku: line.sku,
                                producto_codigo: line.codigo,
                                producto_cod_proscai: line.proscai,
                              }}
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2">
                            {talla && (
                              <span className="rounded-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                                {talla}
                              </span>
                            )}
                            {lleno && <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">✓ completo</span>}
                          </p>
                          <p className="mt-0.5 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                            Pendiente <b className="text-slate-700 dark:text-slate-200">{fmt(line.pendiente)}</b>
                            {" · "}Ordenado {fmt(line.ordenado)}
                            {line.enMaquila > 0 && <> · {enMaquilaTexto(line)}</>}
                          </p>
                          {error !== undefined && (
                            <p role="alert" className="mt-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                              {error}
                            </p>
                          )}
                        </div>
                        {!lleno && (
                          <button
                            type="button"
                            onClick={() => setCantidad(line.id, String(line.tope))}
                            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 cursor-pointer"
                          >
                            Todo ({fmt(line.tope)})
                          </button>
                        )}
                        <QuantitySelector
                          value={qty}
                          // `QuantitySelector` no tiene techo: se topa aquí, en enteros. Si
                          // "Todo" dejó el pendiente fraccionario, un "+" no lo baja.
                          onChange={(next) => setCantidad(line.id, String(capturaManualRecepcion(next, qty, line.tope)))}
                          min={0}
                          label={`Cantidad recibida de ${line.nombre}${talla ? ` talla ${talla}` : ""}`}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}

        {/* Renglones sin nada que recibir: al final y atenuados, con su motivo. */}
        {noRecibibles.map((line) => {
          // Tras releer el onboarding (EC-919), el renglón rechazado puede haber
          // quedado sin tope: su error sigue a la vista aquí.
          const error = lineErrors[line.id];
          return (
            <li
              key={line.id}
              data-line-error={error !== undefined || undefined}
              className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5 ${error !== undefined ? "bg-red-50/70 dark:bg-red-500/10" : "opacity-50"}`}
            >
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                {line.nombre}
                {tallaDe(line) && <span className="text-slate-400"> · {tallaDe(line)}</span>}
              </span>
              <span className="shrink-0 rounded-md bg-slate-100 dark:bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {line.sinTope}
              </span>
              {error !== undefined && (
                <p role="alert" className="basis-full pl-5 text-[11px] font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
