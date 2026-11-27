"use client";

import { useState, type KeyboardEvent, type SetStateAction } from "react";

import { SkuCode } from "@/src/components/SkuCode";
import { BoxIcon, CheckIcon, PlusIcon } from "@/src/components/Icons";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { hasLineCode, type LineCodes } from "@/src/utils/sku";
import { packingLineProductoNombre } from "../hooks/usePackingStep2Form";
import type { PackingOnboardingLine } from "../interfaces/packing-onboarding.interface";
import {
  boxPieces,
  boxQty,
  fillRemaining,
  moveLineTo,
  newPackingBox,
  remainingFor,
  removeBox,
  setBoxLineQty,
  type PackingBox,
  type PackingBoxLine,
  type PackingBoxesStatus,
} from "../utils/packingBoxes";

interface PackingBoxesBoardProps {
  rows: PackingOnboardingLine[];
  boxLines: PackingBoxLine[];
  boxes: PackingBox[];
  setBoxes: (update: SetStateAction<PackingBox[]>) => void;
  status: PackingBoxesStatus;
  pesoTotal: number | null;
}

const MAX_COLUMNAS_CAJA = 3;

const miles = (n: number) =>
  n.toLocaleString("es-MX", { maximumFractionDigits: 4 });

/**
 * Tablero de cajas del embarque: una columna por caja, una fila por prenda.
 * El usuario reparte piezas tecleando en la celda o con atajos (toda la
 * prenda a la caja activa, lo que falta a la caja activa). "Falta" por fila
 * dice qué queda sin acomodar; se envía tal cual como `cajas`.
 */
export function PackingBoxesBoard({
  rows,
  boxLines,
  boxes,
  setBoxes,
  status,
  pesoTotal,
}: PackingBoxesBoardProps) {
  const [activa, setActiva] = useState(0);
  const caja = Math.min(activa, boxes.length - 1);

  const lineByKey = new Map(boxLines.map((l) => [l.key, l]));
  const visibles = rows.filter((r) => lineByKey.has(String(r.picking_detalle)));
  const yaEmpacadas = rows.length - visibles.length;
  const completo =
    status.pendientes > 0 &&
    status.acomodadas >= status.pendientes &&
    status.excedidas.length === 0;
  const avance =
    status.pendientes > 0
      ? Math.min(100, (status.acomodadas / status.pendientes) * 100)
      : 0;

  const codigosDe = (row: PackingOnboardingLine): LineCodes => ({
    producto_variante_sku: row.producto_variante_sku ?? row.sku_muestra,
    producto_codigo: row.producto_codigo,
    producto_cod_proscai: row.producto_cod_proscai,
  });
  const conCodigos = hasLineCode(visibles.map(codigosDe));

  const setCelda = (boxIndex: number, line: PackingBoxLine, raw: string) => {
    const limpio = sanitizeDecimalInput(raw, 4);
    setBoxes((prev) => setBoxLineQty(prev, boxIndex, line, limpio));
  };
  const setPeso = (boxIndex: number, raw: string) => {
    const limpio = sanitizeDecimalInput(raw, 3);
    setBoxes((prev) =>
      prev.map((b, i) => (i === boxIndex ? { ...b, peso: limpio } : b)),
    );
  };
  const agregarCaja = () => {
    setBoxes((prev) => [...prev, newPackingBox()]);
    setActiva(boxes.length);
  };
  const quitarCaja = (i: number) => {
    setBoxes((prev) => removeBox(prev, i));
    setActiva((a) => (a >= i ? Math.max(0, a - 1) : a));
  };
  const faltaAActiva = () =>
    setBoxes((prev) => fillRemaining(prev, caja, boxLines));
  const vaciarTodo = () =>
    setBoxes((prev) => prev.map((b) => ({ ...b, contenido: {} })));

  const faltaTotal = Math.max(0, status.pendientes - status.acomodadas);
  // Hasta 3 cajas caben como columnas. Con más, la tabla muestra solo la caja
  // activa y una columna "En otras cajas": el ancho no crece con las cajas y
  // nunca hay que deslizar de lado.
  const compacta = boxes.length > MAX_COLUMNAS_CAJA;
  const columnas = compacta ? [caja] : boxes.map((_, i) => i);
  // Enter en el peso no debe registrar el embarque.
  const sinEnviar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.preventDefault();
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
      {/* ── Encabezado: avance y acciones globales ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Cajas del embarque
          </h3>
          <p
            className="text-xs tabular-nums text-slate-500 dark:text-slate-400"
            aria-live="polite"
          >
            <b
              className={
                completo
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-800 dark:text-slate-100"
              }
            >
              {miles(status.acomodadas)}
            </b>{" "}
            de {miles(status.pendientes)} pzas acomodadas
            {yaEmpacadas > 0 && (
              <> · {yaEmpacadas} prendas ya empacadas antes</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status.acomodadas > 0 && (
            <button
              type="button"
              onClick={vaciarTodo}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            >
              Vaciar cajas
            </button>
          )}
          {faltaTotal > 0 && (
            <button
              type="button"
              onClick={faltaAActiva}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 active:scale-95 transition cursor-pointer"
            >
              <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Lo que falta → Caja {caja + 1}
            </button>
          )}
        </div>
      </div>
      <div className="h-1 w-full bg-slate-100 dark:bg-white/5">
        <div
          className={`h-full transition-all duration-300 ${completo ? "bg-emerald-500" : "bg-accent"}`}
          style={{ width: `${avance}%` }}
        />
      </div>

      {/* ── Cajas: elegir la activa, peso y piezas ─────────────────────── */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2 px-4 py-3 max-h-[30vh] overflow-y-auto bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
        {boxes.map((box, i) => {
          const activaEsta = i === caja;
          const piezas = boxPieces(box);
          const sinPeso = !(Number.parseFloat(box.peso) > 0);
          return (
            <div
              key={box.id}
              className={`relative rounded-xl border px-3 py-2 transition-colors ${
                activaEsta
                  ? "border-accent bg-white dark:bg-zinc-900 ring-2 ring-accent/30"
                  : "border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiva(i)}
                aria-pressed={activaEsta}
                className="flex w-full items-center gap-2 text-left cursor-pointer"
              >
                <BoxIcon
                  className={`h-4 w-4 ${activaEsta ? "text-accent" : "text-slate-400"}`}
                  aria-hidden="true"
                />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Caja {i + 1}
                </span>
                <span
                  className={`ml-auto text-xs tabular-nums ${
                    piezas > 0
                      ? "font-semibold text-slate-700 dark:text-slate-200"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {piezas > 0 ? `${miles(piezas)} pzas` : "vacía"}
                </span>
              </button>
              <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="sr-only">Peso de la caja {i + 1}</span>
                <input
                  inputMode="decimal"
                  placeholder="Peso"
                  aria-required="true"
                  aria-invalid={sinPeso}
                  value={box.peso}
                  onChange={(e) => setPeso(i, e.target.value)}
                  onFocus={(e) => {
                    setActiva(i);
                    e.currentTarget.select();
                  }}
                  onKeyDown={sinEnviar}
                  className={`h-8 w-full rounded-lg border bg-transparent px-2 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400 focus:border-accent focus:outline-none ${
                    sinPeso
                      ? "border-amber-400 dark:border-amber-500/60"
                      : "border-slate-200 dark:border-white/10"
                  }`}
                />
                kg
              </label>
              {piezas === 0 && faltaTotal > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiva(i);
                    setBoxes((prev) => fillRemaining(prev, i, boxLines));
                  }}
                  className="mt-1.5 w-full rounded-lg bg-accent/10 py-1 text-xs font-semibold text-accent hover:bg-accent/20 cursor-pointer"
                >
                  Meter lo que falta ({miles(faltaTotal)})
                </button>
              )}
              {boxes.length > 1 && (
                <button
                  type="button"
                  onClick={() => quitarCaja(i)}
                  aria-label={`Quitar caja ${i + 1}`}
                  title="Quitar caja (lo que llevaba vuelve a faltar)"
                  className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs text-slate-400 hover:text-red-600 hover:border-red-300 cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={agregarCaja}
          className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-500 hover:border-accent hover:text-accent cursor-pointer transition-colors"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          Agregar caja
        </button>
      </div>

      {/* ── Matriz prenda × caja ───────────────────────────────────────── */}
      <div className="max-h-[42vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <tr className="border-b border-slate-100 dark:border-white/5">
              <th className="px-4 py-2 text-left">Prenda</th>
              <th className="px-2 py-2 text-right">Por empacar</th>
              {columnas.map((i) => (
                <th
                  key={boxes[i].id}
                  className={`px-2 py-2 text-center ${i === caja ? "text-accent" : ""}`}
                >
                  Caja {i + 1}
                </th>
              ))}
              {compacta && <th className="px-2 py-2 text-left">En otras cajas</th>}
              <th className="px-4 py-2 text-right">Falta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {visibles.map((row, rowIdx) => {
              const key = String(row.picking_detalle);
              const line = lineByKey.get(key)!;
              const falta = remainingFor(boxes, line);
              const nombre = packingLineProductoNombre(row);
              return (
                <tr
                  key={key}
                  className={
                    falta < 0
                      ? "bg-red-50/60 dark:bg-red-500/5"
                      : falta === 0
                        ? "bg-emerald-50/40 dark:bg-emerald-500/5"
                        : ""
                  }
                >
                  <td className="px-4 py-2 align-top">
                    <div className="flex items-start gap-3">
                      {conCodigos && (
                        <div className="w-28 shrink-0 text-xs">
                          <SkuCode linea={codigosDe(row)} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <span
                            className="truncate font-semibold text-slate-800 dark:text-slate-100"
                            title={nombre}
                          >
                            {nombre}
                          </span>
                          {row.talla_nombre && (
                            <span className="shrink-0 rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {row.talla_nombre}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {row.color_nombre}
                          {row.color_nombre && boxes.length > 1 && " · "}
                          {boxes.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setBoxes((prev) => moveLineTo(prev, caja, line))
                              }
                              className="font-semibold text-accent hover:underline cursor-pointer"
                              title={`Poner las ${miles(line.pendiente)} piezas en la caja ${caja + 1}`}
                            >
                              Toda a Caja {caja + 1}
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right align-top font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {miles(line.pendiente)}
                  </td>
                  {columnas.map((i) => {
                    const box = boxes[i];
                    const v = box.contenido[key] ?? "";
                    return (
                      <td
                        key={box.id}
                        className={`px-2 py-2 align-top ${i === caja ? "bg-accent/5" : ""}`}
                      >
                        <input
                          inputMode="decimal"
                          placeholder="0"
                          value={v}
                          onChange={(e) => setCelda(i, line, e.target.value)}
                          data-celda={`${i}:${rowIdx}`}
                          onKeyDown={(e) => {
                            // Enter baja a la siguiente prenda de la misma caja
                            // (como una hoja), nunca envía el embarque.
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            const sig = e.currentTarget
                              .closest("table")
                              ?.querySelector<HTMLInputElement>(
                                `[data-celda="${i}:${rowIdx + (e.shiftKey ? -1 : 1)}"]`,
                              );
                            sig?.focus();
                          }}
                          onFocus={(e) => {
                            setActiva(i);
                            e.currentTarget.select();
                          }}
                          aria-label={`Piezas de ${nombre}${row.talla_nombre ? ` ${row.talla_nombre}` : ""} en la caja ${i + 1}`}
                          className={`mx-auto block h-9 w-16 rounded-lg border bg-white dark:bg-zinc-900 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                            boxQty(box, key) > 0
                              ? "border-accent/50 text-slate-900 dark:text-white"
                              : "border-slate-200 dark:border-white/10 text-slate-400"
                          }`}
                        />
                      </td>
                    );
                  })}
                  {compacta && (
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {boxes.map((b, j) =>
                          j === caja || boxQty(b, key) <= 0 ? null : (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setActiva(j)}
                              title={`Ir a la caja ${j + 1}`}
                              className="rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300 hover:bg-accent/10 hover:text-accent cursor-pointer"
                            >
                              C{j + 1}·{miles(boxQty(b, key))}
                            </button>
                          ),
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-2 text-right align-top tabular-nums">
                    {falta === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        Listo
                      </span>
                    ) : falta < 0 ? (
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">
                        {miles(-falta)} de más
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {miles(falta)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0 bg-slate-50 dark:bg-zinc-900 text-xs tabular-nums">
            <tr className="border-t-2 border-slate-200 dark:border-white/10">
              <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">
                Total
              </td>
              <td className="px-2 py-2 text-right font-bold text-slate-700 dark:text-slate-200">
                {miles(status.pendientes)}
              </td>
              {columnas.map((i) => (
                <td
                  key={boxes[i].id}
                  className="px-2 py-2 text-center font-bold text-slate-700 dark:text-slate-200"
                >
                  {miles(boxPieces(boxes[i]))}
                </td>
              ))}
              {compacta && (
                <td className="px-2 py-2 font-bold text-slate-700 dark:text-slate-200">
                  {miles(status.acomodadas - boxPieces(boxes[caja]))} pzas
                </td>
              )}
              <td className="px-4 py-2 text-right font-bold">
                {faltaTotal === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    0
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    {miles(faltaTotal)}
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <td className="px-4 pb-2 text-slate-500 dark:text-slate-400">
                Peso total
              </td>
              <td
                colSpan={columnas.length + (compacta ? 3 : 2)}
                className="px-4 pb-2 text-right font-bold text-slate-800 dark:text-slate-100"
              >
                {pesoTotal === null ? (
                  <span className="font-normal text-slate-400">
                    sin capturar
                  </span>
                ) : (
                  `${miles(pesoTotal)} kg`
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
