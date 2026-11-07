"use client";

import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type { SpecialOrderLine } from "../interfaces/special-order.interface";
import { getLineSkuStatus, isGeneratedTalla } from "../utils/lineSkuStatus";

interface Kpi {
  label: string;
  value: string;
  hint?: string;
  /** 0–100; con barra cuando viene. */
  pct?: number;
  tone?: "emerald" | "amber" | "slate";
}

const TONE = {
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  amber: { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  slate: { text: "text-slate-900 dark:text-white", bar: "bg-slate-400" },
};

const toneFor = (done: number, total: number): Kpi["tone"] =>
  total > 0 && done >= total ? "emerald" : done > 0 ? "amber" : "slate";

/**
 * Resumen del pedido especial, calculado con las líneas que ya trae el detalle
 * (sin consulta extra): piezas, tallas con SKU de producción, tallas en
 * catálogo y líneas que aún requieren acción. Es lo primero que se lee.
 */
export function SpecialOrderSummary({ detalles }: { detalles: SpecialOrderLine[] }) {
  const tallas = detalles.flatMap((line) => line.tallas).filter((t) => Number(t.cantidad) > 0);
  const piezas = tallas.reduce((acc, t) => acc + (Number.isFinite(t.cantidad) ? t.cantidad : 0), 0);
  const conSku = tallas.filter(isGeneratedTalla).length;
  const enCatalogo = tallas.filter((t) => Boolean(t.sku_catalogo)).length;
  const pendientes = detalles.filter((line) => getLineSkuStatus(line).kind === "pending").length;
  const surtido = tallas.reduce((acc, t) => acc + (t.avance?.surtido ?? 0), 0);
  const hasAvance = tallas.some((t) => t.avance !== undefined);
  const pct = (n: number) => (tallas.length > 0 ? Math.round((n / tallas.length) * 100) : 0);

  const kpis: Kpi[] = [
    {
      label: "Piezas",
      value: formatQuantityValue(piezas),
      hint: `${detalles.length} ${detalles.length === 1 ? "línea" : "líneas"} · ${tallas.length} ${tallas.length === 1 ? "talla" : "tallas"}`,
    },
    {
      label: "Tallas con SKU",
      value: `${conSku} de ${tallas.length}`,
      pct: pct(conSku),
      tone: toneFor(conSku, tallas.length),
    },
    {
      label: "En catálogo",
      value: `${enCatalogo} de ${tallas.length}`,
      pct: pct(enCatalogo),
      tone: toneFor(enCatalogo, tallas.length),
    },
    ...(hasAvance
      ? [
          {
            label: "Surtido",
            value: `${formatQuantityValue(surtido)} de ${formatQuantityValue(piezas)}`,
            pct: piezas > 0 ? Math.min(100, Math.round((surtido / piezas) * 100)) : 0,
            tone: toneFor(surtido, piezas),
          } satisfies Kpi,
        ]
      : []),
    {
      label: "Líneas por atender",
      value: String(pendientes),
      hint: pendientes === 0 ? "Todo con SKU" : "Les falta generar SKU",
      tone: pendientes === 0 ? "emerald" : "amber",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-5 gap-3">
      {kpis.map((kpi) => {
        const tone = TONE[kpi.tone ?? "slate"];
        return (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 px-4 py-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {kpi.label}
            </p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${tone.text}`}>{kpi.value}</p>
            {kpi.pct !== undefined ? (
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${kpi.pct}%` }} />
              </div>
            ) : (
              kpi.hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{kpi.hint}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
