"use client";

import Link from "next/link";
import { Button } from "@/src/components/Button";
import { ChevronRightIcon, TrendingUpIcon } from "@/src/components/Icons";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { formatKpiMonto } from "@/src/utils/kpiFormat";
import { getEstadoOportunidadCfg } from "../constants/opportunityChoices";
import { OPPORTUNITIES_LIST_PATH, opportunityDetailPath } from "../constants/opportunityRoutes";
import {
  RECENT_OPPORTUNITIES_LIMIT,
  useRecentOpportunities,
} from "../hooks/useRecentOpportunities";
import type { Opportunity } from "../interfaces/opportunity.interface";
import { getOpportunityName } from "../utils/describeOpportunity";

const MUTED_CLS = "text-slate-400 dark:text-slate-500";
const TH_CLS = "px-6 py-3 font-semibold";

function RecentOpportunityRow({ opportunity }: { opportunity: Opportunity }) {
  // `estado` es un valor del backend: uno fuera del catálogo cae al gris neutro.
  const estadoCfg = getEstadoOportunidadCfg(opportunity.estado);

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors">
      <td className="px-6 py-3">
        <Link
          href={opportunityDetailPath(opportunity.id)}
          title="Ver detalle"
          className="font-semibold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          {getOpportunityName(opportunity)}
        </Link>
      </td>
      <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
        {opportunity.cliente_nombre || <span className={MUTED_CLS}>Sin cliente</span>}
      </td>
      <td className="px-6 py-3">
        <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${estadoCfg.dot}`}
            aria-hidden="true"
          />
          {estadoCfg.label}
        </span>
      </td>
      {/* Sin símbolo de moneda: las oportunidades no tienen moneda. */}
      <td className="px-6 py-3 text-right font-medium tabular-nums text-slate-700 dark:text-slate-200">
        {formatKpiMonto(safeParseAmount(opportunity.monto_estimado))}
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
        {formatShortDate(opportunity.created_at)}
      </td>
    </tr>
  );
}

/**
 * Las oportunidades más recientes del usuario, para la portada de Ventas
 * (`useRecentOpportunities`). Cada una enlaza a su detalle y "Ver todas", al
 * listado. Tiene su propia carga y su propio error con reintento.
 */
export const RecentOpportunities = () => {
  const { opportunities, isInitialError, isFetching, refetch } = useRecentOpportunities();

  return (
    <section
      aria-label="Oportunidades recientes"
      className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden flex flex-col"
    >
      <div className="px-6 py-5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/2">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <TrendingUpIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <h2 className="font-bold text-slate-800 dark:text-white text-sm">Oportunidades recientes</h2>
        </div>
        <Link
          href={OPPORTUNITIES_LIST_PATH}
          className="text-xs text-sky-600 hover:text-sky-500 font-bold uppercase tracking-wider transition-colors flex items-center gap-1 group rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="Ver todas las oportunidades"
        >
          Ver todas
          <ChevronRightIcon
            className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
            aria-hidden="true"
          />
        </Link>
      </div>

      {isInitialError ? (
        <div role="alert" className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            No se pudieron cargar las oportunidades recientes.
          </p>
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? "Reintentando..." : "Reintentar"}
          </Button>
        </div>
      ) : opportunities === undefined ? (
        <div role="status" aria-label="Cargando oportunidades recientes" className="space-y-2 p-6">
          {Array.from({ length: RECENT_OPPORTUNITIES_LIMIT }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-9 rounded-lg" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <p className={`px-6 py-8 text-center text-sm ${MUTED_CLS}`}>
          Aún no hay oportunidades registradas
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-170">
            <thead className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-white/2 border-b border-slate-100 dark:border-white/10">
              <tr>
                <th className={TH_CLS}>Oportunidad</th>
                <th className={TH_CLS}>Cliente</th>
                <th className={TH_CLS}>Estado</th>
                <th className={`${TH_CLS} text-right`}>Monto estimado</th>
                <th className={TH_CLS}>Creada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {opportunities.map((opportunity) => (
                <RecentOpportunityRow key={opportunity.id} opportunity={opportunity} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
