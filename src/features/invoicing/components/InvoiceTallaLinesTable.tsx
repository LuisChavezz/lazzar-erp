"use client";

import { DecimalQuantityInput } from "@/src/components/DecimalQuantityInput";
import { LayersIcon } from "@/src/components/Icons";
import type { InvoiceOnboardingTalla } from "../interfaces/invoice-onboarding.interface";
import { formatCentavos } from "../utils/invoiceEstimate";

interface InvoiceTallaLinesTableProps {
  tallas: InvoiceOnboardingTalla[];
  /** Piezas capturadas por `pedido_detalle_talla` ("" o ausente = no se factura). */
  quantities: Map<number, string>;
  facturablesCount: number;
  disabled?: boolean;
  onQuantityChange: (pedidoDetalleTallaId: number, value: string) => void;
  onFillAll: () => void;
  onClearAll: () => void;
}

/**
 * Tallas del pedido con las piezas a facturar en ESTA factura.
 *
 * Calca la presentación de `EmbroideryOrderLinesTable` (tarjeta con renglones,
 * resumen pedida/facturada/pendiente y `DecimalQuantityInput` con
 * `decimalPlaces={0}` y techo en lo pendiente) pero SIN casilla por línea: aquí
 * la cantidad vacía ya significa "esta talla no entra". No se generaliza aquella
 * tabla porque está tipada a su onboarding y arrastra ubicaciones de bordado y
 * servicios que no aplican.
 *
 * Las tallas que no pueden facturarse se ven deshabilitadas, no se ocultan: las
 * ya facturadas («Facturada») y las de renglones fuera de catálogo («Fuera de
 * catálogo»), que el backend rechaza.
 */
export function InvoiceTallaLinesTable({
  tallas,
  quantities,
  facturablesCount,
  disabled = false,
  onQuantityChange,
  onFillAll,
  onClearAll,
}: InvoiceTallaLinesTableProps) {
  const capturadas = Array.from(quantities.values()).filter((value) => value !== "").length;

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-3 bg-slate-50/50 dark:bg-white/2">
        <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm shrink-0">
          <LayersIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
            Piezas por talla
          </h3>
          <p className="text-[11px] text-slate-500">
            {capturadas === 0
              ? "Ninguna talla capturada"
              : `${capturadas} de ${facturablesCount} talla${facturablesCount === 1 ? "" : "s"} con piezas`}
          </p>
        </div>
        {facturablesCount > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            {capturadas > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                disabled={disabled}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={onFillAll}
              disabled={disabled}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Llenar todo lo pendiente
            </button>
          </div>
        )}
      </div>

      <div className="p-2 sm:p-4 max-h-[46vh] overflow-y-auto">
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {tallas.map((talla) => {
            const id = talla.pedido_detalle_talla;
            // Un renglón externo puede no traer nombre (`producto_nombre: null`).
            const productoNombre = talla.producto_nombre ?? "Producto externo";
            const fueraDeCatalogo = talla.producto === null;
            const sinPrecio = talla.precio_unitario_centavos === 0;

            return (
              <div
                key={id}
                className={`py-3 px-2 rounded-lg flex items-start gap-3 transition-colors ${
                  talla.facturable ? "hover:bg-slate-50 dark:hover:bg-white/5" : "opacity-60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {productoNombre}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-sky-50 dark:bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                      Talla {talla.talla_nombre}
                    </span>
                    {fueraDeCatalogo ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Fuera de catálogo
                      </span>
                    ) : (
                      talla.cantidad_pendiente <= 0 && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Facturada
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {sinPrecio ? (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Sin precio
                      </span>
                    ) : (
                      <>P.U. {formatCentavos(talla.precio_unitario_centavos)} (sin IVA)</>
                    )}{" "}
                    · Pedida: {talla.cantidad_pedida} pzas · Facturada: {talla.cantidad_facturada} pzas ·{" "}
                    <span
                      className={
                        talla.facturable ? "font-semibold text-slate-700 dark:text-slate-200" : ""
                      }
                    >
                      Pendiente: {talla.cantidad_pendiente} pzas
                    </span>
                  </p>
                  {fueraDeCatalogo && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      El renglón del pedido no tiene producto de catálogo; no puede facturarse.
                    </p>
                  )}
                </div>

                <DecimalQuantityInput
                  value={quantities.get(id) ?? ""}
                  max={talla.facturable ? talla.cantidad_pendiente : 0}
                  decimalPlaces={0}
                  disabled={disabled || !talla.facturable}
                  onChange={(next) => onQuantityChange(id, next)}
                  label={`Piezas a facturar de ${productoNombre} talla ${talla.talla_nombre}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
