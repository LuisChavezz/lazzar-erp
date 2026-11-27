"use client";

import { useState } from "react";
import { DecimalQuantityInput } from "@/src/components/DecimalQuantityInput";
import { FormInput } from "@/src/components/FormInput";
import { ScanCapture, SizeProgressChip, type ScanModo, type ScanResult } from "@/src/components/ScanCapture";
import { RfidFeedStrip } from "@/src/features/rfid-scanner/components/RfidFeedStrip";
import { SkuCode } from "@/src/components/SkuCode";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { hasLineCode, splitSku } from "@/src/utils/sku";
import type { PickingOnboardingTalla } from "../interfaces/picking-onboarding.interface";
import type { PickingLineLimits } from "../hooks/usePickingStep2Form";
import { PendingQuantities } from "@/src/utils/pendingQuantities";
import { anyScannable, groupByProduct, leerEnSurtido } from "../utils/pickingScan";

interface PickingLinesPanelProps {
  rows: PickingOnboardingTalla[];
  limits: Record<string, PickingLineLimits>;
  quantities: Record<string, string>;
  observaciones: Record<string, string>;
  setQuantity: (tallaId: number, value: string) => void;
  setObservacion: (tallaId: number, value: string) => void;
}

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
  const [modo, setModo] = useState<ScanModo>(scannable ? "scanner" : "manual");
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(() => new Set());
  const [resaltada, setResaltada] = useState<string | null>(null);
  const [enVuelo] = useState(() => new PendingQuantities());

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

  const procesarLectura = (leido: string): ScanResult => {
    // Lo capturado hasta ESTA lectura: con las que la antena entregó antes en la
    // misma tanda, aunque su render no haya llegado (`PendingQuantities`).
    const capturadoAhora = (row: PickingOnboardingTalla) =>
      n(enVuelo.read(quantities, String(row.pedido_detalle_talla)));
    const { result, row, cantidad } = leerEnSurtido(rows, leido, capturadoAhora, maxOf);
    if (row) {
      const grupo = grupos.find((g) => g.rows.includes(row));
      if (grupo) setAbiertos((prev) => new Set(prev).add(grupo.key));
      setResaltada(String(row.pedido_detalle_talla));
    }
    if (row && cantidad !== undefined) {
      enVuelo.write(quantities, String(row.pedido_detalle_talla), String(cantidad));
      setQuantity(row.pedido_detalle_talla, String(cantidad));
    }
    return result;
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <ScanCapture
        title="Tallas por surtir"
        captured={totalCapturado}
        total={totalTecho}
        totalLabel="pzas que se pueden surtir hoy"
        modo={modo}
        onModoChange={setModo}
        scannable={scannable}
        heroTitle="Surte con el lector"
        heroText="Cada prenda escaneada suma 1 pieza a su talla. Nunca pasa de lo que se puede surtir."
        unscannableText="Las tallas de este pedido todavía no traen código para reconocerlas. Usa Manual mientras tanto."
        placeholder="Escanea la etiqueta de la prenda…"
        inputId="picking-scan"
        onScan={procesarLectura}
        liveFeed={<RfidFeedStrip onCode={procesarLectura} pantalla="Surtido" />}
      />

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
                    {grupo.rows.map((r) => (
                      <SizeProgressChip
                        key={r.pedido_detalle_talla}
                        label={r.talla_nombre ?? "—"}
                        captured={qtyOf(r)}
                        total={maxOf(r)}
                      />
                    ))}
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
