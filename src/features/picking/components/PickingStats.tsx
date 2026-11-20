"use client";

import { InventariosIcon, RouteIcon } from "@/src/components/Icons";
import { KpiCard, type KpiItem } from "@/src/components/KpiGrid";
import { destinoTone } from "../constants/pickingDestinoTone";
import type { PickingsResumen } from "../interfaces/picking.interface";
import { getProgramacionDestinoLabel } from "../utils/pickingDestino";

const miles = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 4 });

/**
 * KPIs de surtidos desde `GET /wms/pickings/resumen/`: el backend cuenta TODO
 * el conjunto con los filtros vigentes (no solo la página), sin cancelados, y
 * "hoy" es su día de México. `resumen` `undefined` = cargando: se muestran
 * guiones, nunca ceros que parezcan datos.
 */
export function PickingStats({ resumen, isFiltered }: { resumen: PickingsResumen | undefined; isFiltered: boolean }) {
  const r = resumen;
  const destinos = (r?.piezas_por_destino ?? []).filter((d) => d.piezas > 0);
  const total = destinos.reduce((acc, d) => acc + d.piezas, 0);
  const alcance = isFiltered ? "Con los filtros aplicados" : "A qué programación se ha surtido";

  const cards: KpiItem[] = [
    {
      label: "Por empacar",
      value: r ? String(r.por_empacar.surtidos) : "—",
      icon: InventariosIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: r ? `${miles(r.por_empacar.piezas)} pzas esperando embarque` : "Cargando…",
      status: r && r.por_empacar.surtidos > 0 ? "negative" : "neutral",
    },
    {
      label: "Surtidos hoy",
      value: r ? String(r.surtidos_hoy.surtidos) : "—",
      icon: RouteIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: r
        ? `${miles(r.surtidos_hoy.piezas)} pzas · ${r.surtidos_hoy.pedidos} ${r.surtidos_hoy.pedidos === 1 ? "pedido" : "pedidos"}`
        : "Cargando…",
      status: "neutral",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-stretch gap-4" role="list">
      {cards.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
      <section
        aria-label="Piezas por destino"
        className="h-full flex flex-col justify-center rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-5 shadow-sm md:col-span-2"
      >
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Piezas por destino</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{alcance}</p>
          </div>
          <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
            {r ? miles(total) : "—"} <span className="text-xs font-normal text-slate-400">pzas</span>
          </span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {destinos.map((d) => (
            <div
              key={d.destino ?? "sin"}
              className={`h-full transition-[width] duration-300 ${destinoTone(d.destino).bar}`}
              style={{ width: `${(d.piezas / total) * 100}%` }}
            />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {r && destinos.length === 0 && <li className="text-xs text-slate-400">Sin piezas surtidas.</li>}
          {destinos.map((d) => (
            <li key={d.destino ?? "sin"} className="flex items-center gap-1.5 text-xs">
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${destinoTone(d.destino).bar}`} />
              <span className="text-slate-600 dark:text-slate-300">
                {d.destino ? getProgramacionDestinoLabel(d.destino) : "Sin programación"}
              </span>
              <b className="tabular-nums text-slate-800 dark:text-slate-100">{miles(d.piezas)}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
