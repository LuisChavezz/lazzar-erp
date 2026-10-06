"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { DataTable } from "@/src/components/DataTable";
import { UrlDateInput } from "@/src/components/UrlDateInput";
import { FormSelect } from "@/src/components/FormSelect";
import { Section } from "@/src/components/DetailDialogPrimitives";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import {
  PURCHASE_ORDER_STATUS,
  purchaseOrderStatusEntry,
} from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import { useSupplierPurchaseOrderHistory } from "../hooks/useSupplierPurchaseOrderHistory";
import {
  SUPPLIER_PO_HISTORY_PAGE_SIZE,
  isDateRangeInverted,
  readSupplierPurchaseOrderHistoryFilters,
  toSupplierPurchaseOrderHistoryParams,
  type SupplierPurchaseOrderHistoryFilters,
} from "../utils/supplierPurchaseOrderHistoryFilters";
import { sumMontosPorMoneda } from "../utils/sumMontosPorMoneda";
import { getSupplierPurchaseOrderHistoryColumns } from "./SupplierPurchaseOrderHistoryColumns";

/** Todos los estatus del catálogo (1-6), con la etiqueta del badge. */
const ESTATUS_OPTIONS = Object.values(PURCHASE_ORDER_STATUS).map((code) => ({
  value: String(code),
  label: purchaseOrderStatusEntry(code).label ?? String(code),
}));

interface SupplierPurchaseOrderHistoryProps {
  supplierId: number;
}

/**
 * Historial de órdenes de compra del proveedor: filtros, resumen y tabla
 * paginada en el servidor.
 *
 * La URL de la página es la fuente de verdad de los filtros (`estatus`,
 * `fecha_inicio`, `fecha_final`, `page`), mismo patrón que Conciliaciones:
 * se leen con `useSearchParams`, se validan uno por uno (un valor inválido se
 * trata como ausente y nunca se envía) y se escriben con `history.replaceState`.
 * Cualquier cambio de filtro regresa a la página 1. Los controles viven FUERA
 * de `DataTable` porque filtran en el servidor; la paginación es la de
 * `StockMovementReportView` (`serverPagination`).
 *
 * Carga y error se quedan DENTRO de la sección: un fallo aquí no afecta los
 * datos del proveedor.
 */
export default function SupplierPurchaseOrderHistory({
  supplierId,
}: SupplierPurchaseOrderHistoryProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = readSupplierPurchaseOrderHistoryFilters((key) => searchParams.get(key));
  const rangeInverted = isDateRangeInverted(filters);

  const { data, hasLoaded, isLoading, isError, error, refetch, isFetching, isPlaceholderData } =
    useSupplierPurchaseOrderHistory(supplierId, toSupplierPurchaseOrderHistoryParams(filters));

  // Las fechas de la URL se leen CRUDAS para los controles (ver
  // `UrlDateInput`): la validación solo decide qué se ENVÍA (`filters`).
  const rawFechaInicio = searchParams.get("fecha_inicio") ?? "";
  const rawFechaFinal = searchParams.get("fecha_final") ?? "";

  // Cambiar un filtro es ajustar la vista, no navegar: `replace` para no
  // ensuciar el historial. La URL se REARMA (no se copia la query): `estatus`
  // y `page` con valores validados, las fechas con su texto crudo. La página
  // vuelve a 1 solo si cambia el conjunto EFECTIVO de filtros (lo que se
  // envía): una tecla que deja la fecha incompleta no la mueve.
  const setFilters = (
    patch: { estatus?: number | null; page?: number; fecha_inicio?: string; fecha_final?: string },
  ) => {
    // Se parte de la query ACTUAL del navegador, no de la de este render: dos
    // fechas publicadas casi a la vez (salir de "Desde" y de "Hasta" seguido)
    // no deben pisarse por leer una query que aún no incluye la anterior. Por
    // eso también se escribe con `history.replaceState` y no con
    // `router.replace`: este último actualiza la URL de forma ASÍNCRONA (en
    // esta página dinámica, tras un viaje al servidor), y la segunda escritura
    // leía la query sin la primera. Next sincroniza `useSearchParams` con
    // `replaceState`, y esta página no lee la query en el servidor.
    const current = new URLSearchParams(window.location.search);
    const currentFilters = readSupplierPurchaseOrderHistoryFilters((key) => current.get(key));
    const next = new URLSearchParams();
    const estatus = patch.estatus !== undefined ? patch.estatus : currentFilters.estatus;
    const fechaInicio = patch.fecha_inicio ?? current.get("fecha_inicio") ?? "";
    const fechaFinal = patch.fecha_final ?? current.get("fecha_final") ?? "";
    if (estatus !== null) next.set("estatus", String(estatus));
    if (fechaInicio) next.set("fecha_inicio", fechaInicio);
    if (fechaFinal) next.set("fecha_final", fechaFinal);

    // Lo que se ENVÍA, sin la página.
    const effectiveKey = (f: SupplierPurchaseOrderHistoryFilters) =>
      JSON.stringify(toSupplierPurchaseOrderHistoryParams({ ...f, page: 1 }));
    const nextFilters = readSupplierPurchaseOrderHistoryFilters((key) => next.get(key));
    const page =
      patch.page ??
      (effectiveKey(nextFilters) === effectiveKey(currentFilters) ? currentFilters.page : 1);
    if (page > 1) next.set("page", String(page));

    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  const columns = getSupplierPurchaseOrderHistoryColumns(supplierId, filters);

  // DRF responde 404 a una página fuera de rango (p. ej. una URL guardada con
  // `page=9` cuando ya solo hay 2 páginas). No es "historial no disponible":
  // el reintento lleva a la primera página.
  const isPageOutOfRange = isError && isNotFoundError(error) && filters.page > 1;
  const errorMessage = isPageOutOfRange
    ? "Esa página ya no existe con los filtros actuales."
    : isNotFoundError(error)
      ? "El historial de este proveedor no está disponible."
      : extractErrorMessage(error, "No se pudo cargar el historial de órdenes de compra.");

  const resumen = data?.resumen;
  const montos = resumen ? sumMontosPorMoneda(resumen.monto_por_moneda) : [];

  return (
    <Section title="Historial de órdenes de compra">
      <div className="space-y-4">
        {/* ── Filtros (servidor) ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormSelect
            label="Estatus"
            name="estatus"
            value={filters.estatus === null ? "" : String(filters.estatus)}
            onChange={(event) =>
              setFilters({ estatus: event.target.value ? Number(event.target.value) : null })
            }
          >
            <option value="" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
              Todos
            </option>
            {ESTATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
              >
                {option.label}
              </option>
            ))}
          </FormSelect>
          <UrlDateInput
            label="Desde"
            name="fecha_inicio"
            value={rawFechaInicio}
            onCommit={(value) => setFilters({ fecha_inicio: value })}
          />
          <UrlDateInput
            label="Hasta"
            name="fecha_final"
            value={rawFechaFinal}
            onCommit={(value) => setFilters({ fecha_final: value })}
          />
        </div>
        {rangeInverted && (
          <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
            La fecha inicial es posterior a la final: el periodo no se aplicará hasta corregirlo.
          </p>
        )}

        {/* ── Resumen (todo el conjunto filtrado, no solo esta página) ── */}
        {resumen && (
          <div
            className={`flex flex-wrap gap-x-10 gap-y-4 rounded-xl bg-slate-50 dark:bg-white/5 px-5 py-4 transition-opacity ${
              isPlaceholderData ? "opacity-60" : ""
            }`}
          >
            <div>
              <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                Órdenes de compra
              </span>
              <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                {resumen.total_ordenes}
              </span>
              <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                Con los filtros aplicados
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                Monto comprado
              </span>
              {montos.length === 0 ? (
                <span className="text-lg font-semibold text-slate-900 dark:text-white">—</span>
              ) : (
                <ul>
                  {montos.map((monto) => (
                    <li
                      key={monto.moneda}
                      className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white"
                    >
                      {formatMoneyValueOrDash(monto.total, { currency: monto.moneda })}
                    </li>
                  ))}
                </ul>
              )}
              <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                Sin órdenes canceladas · con los filtros aplicados
              </span>
            </div>
          </div>
        )}

        {/* `DataTable` se monta SIEMPRE: su barra sigue disponible durante la
            carga o un error, y solo el cuerpo alterna. Error de cuerpo solo si
            nunca hubo respuesta para este proveedor (un refetch fallido con
            datos conserva la vista y avisa por toast). */}
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          getRowId={(row) => String(row.id)}
          emptyMessage="Este proveedor no tiene órdenes de compra con los filtros seleccionados."
          serverPagination={{
            pageCount: Math.max(1, Math.ceil((data?.count ?? 0) / SUPPLIER_PO_HISTORY_PAGE_SIZE)),
            currentPage: filters.page,
            onPageChange: (page) => setFilters({ page }),
            isFetching: isPlaceholderData,
          }}
          isLoadingOverlay={isPlaceholderData}
          loadingTitle="Actualizando historial"
          loadingMessage="Cargando las órdenes de compra seleccionadas."
          onRefetch={() => refetch()}
          isRefetching={isFetching}
          isLoading={isLoading}
          isError={isInitialLoadError(isError, hasLoaded)}
          errorTitle="Error al cargar el historial"
          errorMessage={errorMessage}
          onErrorRetry={isPageOutOfRange ? () => setFilters({ page: 1 }) : () => refetch()}
          loadingAriaLabel="Cargando historial de órdenes de compra"
        />
      </div>
    </Section>
  );
}
