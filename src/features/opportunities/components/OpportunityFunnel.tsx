"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/src/components/Button";
import { ChevronRightIcon, FilterIcon } from "@/src/components/Icons";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { formatKpiMonto, plural } from "@/src/utils/kpiFormat";
import {
  ESTADO_OPORTUNIDAD_CFG,
  ESTADO_PERDIDA,
  type EstadoOportunidad,
} from "../constants/opportunityChoices";
import { OPPORTUNITIES_LIST_PATH } from "../constants/opportunityRoutes";
import {
  useOpportunitiesEmbudo,
  type OpportunityEmbudoParams,
} from "../hooks/useOpportunitiesEmbudo";
import { opportunitiesListHrefForEstado } from "../utils/opportunityListQuery";

/**
 * Orden del embudo: el avance de una oportunidad y, al final y aparte, las
 * perdidas (no son una etapa más del avance).
 */
const FUNNEL_ORDER: readonly EstadoOportunidad[] = [
  "Nueva",
  "Contactada",
  "Cotizada",
  "Ganada",
  ESTADO_PERDIDA,
];

/** Ancho mínimo de una barra, para que un estado sin oportunidades se vea. */
const MIN_BAR_WIDTH = "6px";

const ITEM_CLS =
  "group block w-full rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";

/** Filtro por estado del listado: el embudo lo muestra y lo cambia. */
export interface OpportunityFunnelFilter {
  activeEstado: EstadoOportunidad | undefined;
  /** Aplica el estado, o lo quita si ya es el activo. */
  onToggle: (estado: EstadoOportunidad) => void;
}

interface OpportunityFunnelProps {
  /**
   * Filtros del conjunto que se resume (los del listado SIN `estado`, para que
   * las barras muestren siempre la distribución completa). Sin ellos, todo lo
   * que el usuario puede ver.
   */
  params?: OpportunityEmbudoParams;
  /**
   * Con filtro, cada barra es un BOTÓN que lo aplica o lo quita (encima del
   * listado). Sin él, cada barra es un ENLACE al listado filtrado por ese
   * estado (portada de Ventas).
   */
  filter?: OpportunityFunnelFilter;
  /** Versión de tarjeta: barras apiladas y enlace al listado completo. */
  compact?: boolean;
}

/**
 * Embudo de oportunidades: una barra por estado con su cantidad y su monto, y
 * el total arriba (`useOpportunitiesEmbudo`).
 *
 * - El ancho de cada barra es proporcional a la cantidad del estado MÁS
 *   numeroso (ese llena el ancho). Un estado en cero conserva una barra mínima
 *   y sigue siendo interactivo.
 * - Los montos van sin símbolo: las oportunidades no registran moneda.
 * - El nombre accesible de cada barra dice estado, cantidad y monto; la activa
 *   se marca con `aria-pressed`, un contorno y el texto "Filtro activo", no
 *   solo con color.
 * - Tiene su propia carga y su propio error con reintento: un fallo aquí no
 *   afecta a lo que tenga alrededor.
 */
export const OpportunityFunnel = ({ params, filter, compact = false }: OpportunityFunnelProps) => {
  const { embudo, isInitialError, isFetching, isPlaceholderData, refetch } =
    useOpportunitiesEmbudo(params);

  const byEstado = new Map(embudo?.estados.map((row) => [row.estado, row]));
  const rows = FUNNEL_ORDER.map((estado) => ({
    estado,
    cantidad: byEstado.get(estado)?.cantidad ?? 0,
    monto: safeParseAmount(byEstado.get(estado)?.monto),
  }));
  const maxCantidad = Math.max(...rows.map((row) => row.cantidad));

  const renderRow = ({ estado, cantidad, monto }: (typeof rows)[number]) => {
    const cfg = ESTADO_OPORTUNIDAD_CFG[estado];
    const isActive = filter?.activeEstado === estado;
    const pct = maxCantidad > 0 ? (cantidad / maxCantidad) * 100 : 0;
    const montoLabel = formatKpiMonto(monto);
    const name = `${cfg.label}: ${cantidad} ${plural(cantidad, "oportunidad", "oportunidades")}, monto ${montoLabel}`;

    const content: ReactNode = (
      <>
        <span className="flex items-center justify-between gap-2 text-xs">
          <span className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} aria-hidden="true" />
            <span className="font-medium text-slate-600 dark:text-slate-300">{cfg.label}</span>
          </span>
          <span className="font-bold tabular-nums text-slate-800 dark:text-white">{cantidad}</span>
        </span>
        <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <span
            className={`block h-full rounded-full transition-all duration-500 ${cfg.dot} ${
              cantidad === 0 ? "opacity-40" : ""
            }`}
            style={{ width: `max(${pct}%, ${MIN_BAR_WIDTH})` }}
          />
        </span>
        <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="tabular-nums">{montoLabel}</span>
          {isActive && (
            <span className="inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-400">
              <FilterIcon className="h-3 w-3" aria-hidden="true" />
              Filtro activo
            </span>
          )}
        </span>
      </>
    );

    // Las perdidas van aparte: una línea las separa del avance.
    const separatorCls =
      estado === ESTADO_PERDIDA
        ? compact
          ? "border-t border-slate-100 dark:border-white/10 pt-2"
          : "border-t border-slate-100 dark:border-white/10 pt-2 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-2"
        : "";

    return (
      <li key={estado} className={separatorCls}>
        {filter ? (
          <button
            type="button"
            aria-pressed={isActive}
            aria-label={name}
            title={isActive ? "Quitar el filtro por estado" : `Filtrar por ${cfg.label}`}
            onClick={() => filter.onToggle(estado)}
            className={`${ITEM_CLS} ${
              isActive
                ? "ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-50 dark:hover:bg-sky-500/10"
                : ""
            }`}
          >
            {content}
          </button>
        ) : (
          <Link
            href={opportunitiesListHrefForEstado(estado)}
            aria-label={name}
            title={`Ver oportunidades en ${cfg.label}`}
            className={ITEM_CLS}
          >
            {content}
          </Link>
        )}
      </li>
    );
  };

  return (
    <section
      aria-label="Embudo de oportunidades"
      className={`rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 md:p-5 ${
        compact ? "flex h-full flex-col" : ""
      }`}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white">Embudo de oportunidades</h2>
        {embudo && (
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-bold text-slate-800 dark:text-white">{embudo.total.cantidad}</span>{" "}
            {plural(embudo.total.cantidad, "oportunidad", "oportunidades")}
            {" · "}
            <span className="font-bold text-slate-800 dark:text-white">
              {formatKpiMonto(safeParseAmount(embudo.total.monto))}
            </span>
          </p>
        )}
      </div>

      {isInitialError ? (
        <div role="alert" className="flex flex-col items-center gap-2 px-1 py-3 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">No se pudo cargar el embudo.</p>
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Reintentando..." : "Reintentar"}
          </Button>
        </div>
      ) : embudo === undefined ? (
        <div
          role="status"
          aria-label="Cargando embudo"
          className={compact ? "space-y-3" : "grid grid-cols-1 gap-3 lg:grid-cols-5"}
        >
          {FUNNEL_ORDER.map((estado) => (
            <LoadingSkeleton key={estado} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <ul
            aria-busy={isPlaceholderData || undefined}
            className={`transition-opacity ${isPlaceholderData ? "opacity-60" : ""} ${
              compact ? "space-y-2" : "grid grid-cols-1 gap-2 lg:grid-cols-5"
            }`}
          >
            {rows.map(renderRow)}
          </ul>
          <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
            Montos estimados; las oportunidades no registran moneda
          </p>
        </>
      )}

      {compact && (
        <div className="mt-auto pt-3">
          <Link
            href={OPPORTUNITIES_LIST_PATH}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Ver oportunidades
            <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
};
