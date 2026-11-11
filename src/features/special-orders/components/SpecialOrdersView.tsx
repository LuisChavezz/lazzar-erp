"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { useSpecialOrders } from "../hooks/useSpecialOrders";
import {
  getSpecialOrderColumns,
  OPTIONAL_COLUMN_FIELDS,
  SPECIAL_ORDER_HEADER_FILTERS,
} from "./SpecialOrderColumns";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import type { SpecialOrderRow } from "../utils/specialOrderFilters";
import { sortAtrasadosFirst } from "../utils/specialOrderAlert";

type Vista = "proceso" | "completos";

/** Completo = todas sus tallas con cantidad ya tienen SKU de producción. */
const isCompleto = (order: SpecialOrderRow) =>
  order.tallas_total !== undefined &&
  order.tallas_total > 0 &&
  (order.tallas_con_sku ?? 0) >= order.tallas_total;

/**
 * Vista de "Fabricación especial" (solo lectura): pedidos con al menos una línea
 * de muestra, para que Producción vea qué hay que fabricar fuera de catálogo.
 *
 * Mismo armazón que `CorteMangaOrdersView`: `DataTable` montada SIEMPRE (el
 * toolbar sigue visible durante la carga y el error), error de cuerpo solo en la
 * carga inicial, y "Ver detalle" que NAVEGA a
 * `/manufacturing/special-orders/[id]`. Sin KPIs ni exportación.
 *
 * Orden por defecto: los atrasados activos (alerta de 24 h) primero y, dentro
 * de cada grupo, el del servidor (sin confirmar primero). Los filtros de
 * encabezado solo filtran en memoria lo ya cargado.
 */
export function SpecialOrdersView() {
  const { orders, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useSpecialOrders();
  const router = useRouter();

  const [vista, setVista] = useState<Vista>("proceso");
  const completos = orders.filter(isCompleto);
  const enProceso = orders.filter((order) => !isCompleto(order));
  const rows = sortAtrasadosFirst(vista === "completos" ? completos : enProceso);

  const showError = isInitialLoadError(isError, hasLoaded);
  // Una columna de campo opcional solo se monta si el backend ya lo manda.
  const columns = getSpecialOrderColumns({
    onViewDetail: (id) => router.push(`/manufacturing/special-orders/${id}`),
  }).filter((column) => {
    const read = column.id ? OPTIONAL_COLUMN_FIELDS[column.id] : undefined;
    return !read || orders.some((order) => read(order) !== undefined);
  });

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      {/* En proceso / Completos: los terminados no estorban, pero siguen a un clic. */}
      <div
        role="tablist"
        aria-label="Vista de fabricación especial"
        className="inline-flex self-start rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-1"
      >
        {(
          [
            { key: "proceso", label: "En proceso", count: enProceso.length },
            { key: "completos", label: "Completos", count: completos.length },
          ] as const
        ).map((tab) => {
          const active = vista === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setVista(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                active
                  ? "bg-white dark:bg-zinc-800 text-sky-700 dark:text-sky-300 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                  active
                    ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    : "bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                }`}
              >
                {hasLoaded ? tab.count : "…"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0">
      <DataTable
        columns={withHeaderFilters(columns, rows, SPECIAL_ORDER_HEADER_FILTERS)}
        data={rows}
        paginationResetKey={vista}
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por folio o cliente..."
        fillHeight
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage={
          vista === "completos"
            ? "Aún no hay pedidos con todos sus SKU generados."
            : "No hay pedidos de fabricación especial por atender."
        }
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar los pedidos especiales"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando pedidos especiales"
      />
      </div>
    </div>
  );
}
