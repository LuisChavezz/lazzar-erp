"use client";

import { ServerSearchSelectList } from "@/src/components/ServerSearchSelectList";
import { renderRadioIndicator } from "@/src/components/RadioIndicator";
import { usePedidoSearchField } from "../hooks/usePedidoSearch";
import type { PedidoListItem } from "../interfaces/order.interface";
import type { PedidoSearchFilters } from "../utils/pedidoSearchParams";
import { formatOrderAmountOrDash } from "../utils/orderAmountFormat";

interface PedidoServerSelectListProps {
  /** Filtros fijos de la búsqueda (`estatus`, `cliente`, `moneda`); `q` lo pone el buscador. */
  filters?: Omit<PedidoSearchFilters, "q">;
  /** `false` no consulta (p. ej. falta elegir cliente y moneda). Por defecto, `true`. */
  enabled?: boolean;
  /** Pedido elegido (`null` = ninguno): va fijo arriba aunque la búsqueda no lo traiga (issue #262). */
  selected: PedidoListItem | null;
  /** Selección única: reemplaza cualquier anterior. */
  onSelect: (order: PedidoListItem) => void;
  searchPlaceholder: string;
  /** Sin coincidencias y sin término de búsqueda. */
  emptyMessage: string;
  /**
   * Muestra el `gran_total` de cada pedido a la derecha. Ausente para quien no
   * ve importes de pedidos (EC-784): entonces no se pinta.
   */
  showAmount?: boolean;
  maxHeightClassName?: string;
}

/**
 * Lista de SELECCIÓN ÚNICA de pedidos que busca EN EL SERVIDOR (`?q=` por folio,
 * OC o cliente, más los filtros fijos y `?limit=`), en vez de descargar la lista
 * completa. La comparten el Paso 1 de "Nueva Factura" (`InvoiceOrderSelector`)
 * y el pedido de una factura pendiente por cobrar (`CxcPedidoPicker`).
 */
export function PedidoServerSelectList({
  filters,
  enabled = true,
  selected,
  onSelect,
  searchPlaceholder,
  emptyMessage,
  showAmount = false,
  maxHeightClassName,
}: PedidoServerSelectListProps) {
  const {
    search,
    setSearch,
    isSearching,
    pedidos,
    total,
    hasResults,
    isInitialError,
    refetch,
  } = usePedidoSearchField({ ...filters, enabled });

  return (
    <ServerSearchSelectList<PedidoListItem>
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      results={pedidos}
      pinned={selected ? [selected] : []}
      getKey={(order) => order.id}
      isSelected={(order) => order.id === selected?.id}
      onSelect={onSelect}
      renderIndicator={renderRadioIndicator}
      renderContent={(order) => (
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {order.folio || "—"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {order.cliente_nombre || order.cliente_razon_social || "—"}
            </p>
          </div>
          {showAmount && order.gran_total !== undefined && (
            <span className="shrink-0 tabular-nums text-xs font-medium text-slate-600 dark:text-slate-300">
              {formatOrderAmountOrDash(order.gran_total)}
            </span>
          )}
        </div>
      )}
      hasResults={hasResults}
      isInitialError={isInitialError}
      isSearching={isSearching}
      onRetry={() => void refetch()}
      total={total}
      emptyMessage={emptyMessage}
      noResultsMessage="No se encontraron pedidos"
      errorMessage="Error al buscar los pedidos."
      maxHeightClassName={maxHeightClassName}
    />
  );
}
