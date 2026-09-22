"use client";

import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import {
  ClockIcon,
  FacturacionIcon,
  PedidosIcon,
  WalletIcon,
} from "@/src/components/Icons";
import { getPedidoEstatusConfig } from "@/src/features/orders/constants/pedidoStatus";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import type { ResumenComercial } from "../interfaces/customer.interface";

// Texto secundario para los KPIs sin dato (mismo tono que `EmptyLines`). Va en
// `<span>` porque `KpiGrid` pinta `value` dentro de un `<h3>`.
const MutedValue = ({ children }: { children: string }) => (
  <span className="block text-sm font-normal font-sans text-slate-400 dark:text-slate-500 italic whitespace-normal">
    {children}
  </span>
);

export const CustomerResumenKpis = ({ resumen }: { resumen: ResumenComercial }) => {
  const ultimo = resumen.ultimo_pedido;
  const ultimoEstatus = ultimo ? getPedidoEstatusConfig(ultimo.estatus) : null;

  const items: KpiItem[] = [
    {
      label: "Pedidos",
      subLabel: "Total, incluye cancelados",
      value: String(resumen.total_pedidos),
      icon: PedidosIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
    },
    {
      label: "Cotizaciones",
      subLabel: "Total registradas",
      value: String(resumen.total_cotizaciones),
      icon: FacturacionIcon,
      iconBgClass: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
      iconClass: "text-fuchsia-500",
    },
    {
      label: "Monto en pedidos",
      subLabel: "Sin pedidos cancelados",
      // Una línea por moneda DENTRO de la misma tarjeta.
      value:
        resumen.montos_por_moneda.length === 0 ? (
          <MutedValue>Sin montos registrados</MutedValue>
        ) : (
          resumen.montos_por_moneda.map((monto) => (
            <span
              key={monto.moneda}
              className="flex items-baseline justify-between gap-3 tabular-nums"
            >
              {/* `narrowSymbol`: es-MX pinta USD como "USD 1,234.00" y el
                  código ya va en la etiqueta de la derecha. */}
              <span className="text-lg truncate">
                {formatMoneyValue(monto.total, {
                  currency: monto.moneda,
                  currencyDisplay: "narrowSymbol",
                })}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                {monto.moneda}
              </span>
            </span>
          ))
        ),
      icon: WalletIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
    },
    {
      label: "Último pedido",
      subLabel: ultimo ? "Más reciente" : "Sin pedidos",
      value:
        ultimo && ultimoEstatus ? (
          <span className="block">
            {/* `fecha` es un timestamp real (con hora y offset): sin
                `timeZone: "UTC"`, para mostrar el día en la zona del usuario. */}
            <span className="block">{formatShortDate(ultimo.fecha)}</span>
            {/* Folio + estatus: el backend incluye cancelados en
                `ultimo_pedido`, así que el chip deja visible si lo está. */}
            <span className="mt-1 flex items-center gap-2 text-xs font-medium">
              <span className="text-slate-500 dark:text-slate-400">{ultimo.folio}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full font-sans whitespace-nowrap ${ultimoEstatus.className}`}
              >
                {ultimoEstatus.label}
              </span>
            </span>
          </span>
        ) : (
          <MutedValue>Este cliente aún no tiene pedidos</MutedValue>
        ),
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
    },
  ];

  return <KpiGrid items={items} />;
};

/** Marcador de carga de los KPIs mientras se muestra la fila del listado. */
export const CustomerResumenKpisSkeleton = () => (
  <div
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    aria-busy="true"
    aria-label="Cargando resumen comercial"
  >
    {Array.from({ length: 4 }, (_, index) => (
      <div
        key={index}
        className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-5 space-y-4 animate-pulse"
      >
        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-7 w-32 rounded bg-slate-200 dark:bg-white/10" />
      </div>
    ))}
  </div>
);
