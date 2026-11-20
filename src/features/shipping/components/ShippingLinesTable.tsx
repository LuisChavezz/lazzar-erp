"use client";

import { useState } from "react";
import { SkuCode } from "@/src/components/SkuCode";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { hasLineCode, type LineCodes } from "@/src/utils/sku";
import { shipmentLineProductoNombre } from "../hooks/useShippingForm";
import type { ShipmentOnboardingLine } from "../interfaces/shipping-onboarding.interface";
import { StepBadge } from "./ShippingCreateForm";

interface ShippingLinesTableProps {
  rows: ShipmentOnboardingLine[];
}

const codigosDe = (row: ShipmentOnboardingLine): LineCodes => ({
  producto_variante_sku: row.producto_variante_sku,
  producto_codigo: row.producto_codigo,
  producto_cod_proscai: row.producto_cod_proscai,
});

const miles = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 4 });

/**
 * "Lo que sale": el contenido del embarque, de solo lectura. El packing ya
 * confirmó qué va en cada caja y en el envío no se revalida, así que no hay
 * nada que marcar: sale todo lo disponible. Arriba los totales (piezas,
 * líneas, cajas) y, desplegable, el desglose por caja con SKU y Proscai.
 */
export function ShippingLinesTable({ rows }: ShippingLinesTableProps) {
  const [abierto, setAbierto] = useState(false);
  const salen = rows.filter((row) => row.disponible_para_despacho);
  const yaSalieron = rows.filter((row) => row.ya_despachado).length;
  const piezas = salen.reduce((acc, row) => acc + (Number.parseFloat(row.cantidad_empacada) || 0), 0);

  // Por caja, en orden de número; "Sin caja" al final.
  const grupos = new Map<string, { titulo: string; orden: number; rows: ShipmentOnboardingLine[] }>();
  for (const row of salen) {
    const key = row.caja_numero === null ? "sin" : String(row.caja_numero);
    const grupo = grupos.get(key) ?? {
      titulo: row.caja_numero === null ? "Sin caja" : `Caja ${row.caja_numero}`,
      orden: row.caja_numero ?? Number.POSITIVE_INFINITY,
      rows: [],
    };
    grupo.rows.push(row);
    grupos.set(key, grupo);
  }
  const cajas = [...grupos.values()].sort((a, b) => a.orden - b.orden);
  const numCajas = cajas.filter((c) => Number.isFinite(c.orden)).length;
  const conCodigos = hasLineCode(salen.map(codigosDe));

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <StepBadge n={1} done />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Lo que sale</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Todo lo empacado y disponible{yaSalieron > 0 ? ` · ${yaSalieron} ${yaSalieron === 1 ? "línea ya salió" : "líneas ya salieron"} antes` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4 tabular-nums">
          <Kpi value={miles(piezas)} label="pzas" strong />
          <Kpi value={String(salen.length)} label={salen.length === 1 ? "línea" : "líneas"} />
          {numCajas > 0 && <Kpi value={String(numCajas)} label={numCajas === 1 ? "caja" : "cajas"} />}
        </div>
        <span
          aria-hidden="true"
          className={`text-slate-400 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {abierto && (
        <div className="max-h-[38vh] overflow-y-auto border-t border-slate-100 dark:border-white/5">
          {cajas.map((caja) => {
            const piezasCaja = caja.rows.reduce((acc, r) => acc + (Number.parseFloat(r.cantidad_empacada) || 0), 0);
            return (
              <div key={caja.titulo}>
                <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-50 dark:bg-zinc-800 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>{caja.titulo}</span>
                  <span className="tabular-nums">{miles(piezasCaja)} pzas</span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                  {caja.rows.map((row) => (
                    <li key={row.packing_detalle} className="flex items-center gap-3 px-4 py-2">
                      {conCodigos && (
                        <div className="w-28 shrink-0 text-xs">
                          <SkuCode linea={codigosDe(row)} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {shipmentLineProductoNombre(row)}
                          </span>
                          {row.talla_nombre && (
                            <span className="shrink-0 rounded-md bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {row.talla_nombre}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {[row.color_nombre, row.ubicacion_nombre].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                        {formatExactQuantityValue(row.cantidad_empacada)}
                        <span className="ml-0.5 text-[10px] font-normal text-slate-400">pz</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Kpi({ value, label, strong = false }: { value: string; label: string; strong?: boolean }) {
  return (
    <span className="flex flex-col items-end leading-none">
      <span className={`font-bold ${strong ? "text-lg text-emerald-600 dark:text-emerald-400" : "text-sm text-slate-700 dark:text-slate-200"}`}>
        {value}
      </span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </span>
  );
}
