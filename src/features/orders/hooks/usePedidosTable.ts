"use client";

import { keepPreviousData, type QueryKey } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useServerTable, type ServerTableRequest } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import {
  readServerTableState,
  toServerTableCriteria,
  type ServerTableDefinition,
  type ServerTableFilterParams,
} from "@/src/utils/serverTableParams";
import {
  exportOrders,
  getOrdersPage,
  getPedidoFilterOptions,
  getPedidoKpisMesa,
} from "../services/actions";
import {
  pedidoFilterOptionsQueryKey,
  pedidoKpisMesaQueryKey,
} from "../constants/ordersQueryKeys";
import type { PedidoListItem } from "../interfaces/order.interface";
import type { PedidoExportRow } from "../interfaces/pedido-list.interface";
import { toPedidoKpisApiParams, toPedidoListApiParams } from "../utils/pedidoListParams";

// A nivel de módulo: una referencia estable entre renders.
const pedidosAdapter = limitOffsetAdapter<PedidoListItem>();

const MIS_PEDIDOS_PARAM = { mis_pedidos: "true" } as const;

interface UsePedidosTableOptions<P extends ServerTableFilterParams> {
  definition: ServerTableDefinition<P>;
  /** Prefijo de la llave (bajo `["orders"]`, para que las mutaciones lo invaliden). */
  queryKey: QueryKey;
  /** `?mis_pedidos=true`: solo los pedidos de cotizaciones del usuario. */
  misPedidos?: boolean;
  toastId: string;
  /** Conserva 30 min la vista por defecto (ver `useServerTable`). */
  cacheDefaultView?: boolean;
}

/**
 * Una lista de pedidos en MODO SERVIDOR (`GET /ventas/pedidos/`): filtros,
 * búsqueda, orden y página viven en la URL (`useServerTable`), así que la
 * página que la monta la envuelve en `<Suspense>`.
 *
 * Además de lo de `useServerTable` devuelve `fetchExportRows`: TODO el conjunto
 * de los criterios vigentes desde `exportar/` (una sola petición, sin paginar),
 * leídos de la URL al llamarla.
 */
export const usePedidosTable = <P extends ServerTableFilterParams>({
  definition,
  queryKey,
  misPedidos = false,
  toastId,
  cacheDefaultView,
}: UsePedidosTableOptions<P>) => {
  const scope = misPedidos ? MIS_PEDIDOS_PARAM : undefined;
  const table = useServerTable({
    definition,
    queryKey,
    // Los `rango_*` de la URL se traducen aquí, así que también los traduce la
    // exportación por páginas (`fetchAllRows` pasa por esta misma función).
    queryFn: (params: ServerTableRequest) =>
      getOrdersPage({ ...toPedidoListApiParams(params), ...scope }),
    adapter: pedidosAdapter,
    toastId,
    refetchErrorMessage: "No se pudieron actualizar los pedidos. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudieron cargar los pedidos.",
    cacheDefaultView,
  });

  /**
   * Filas de `exportar/` con los criterios de la URL AL LLAMARLA (como
   * `fetchAllRows`): un clic justo después de cambiar un filtro exporta lo
   * nuevo. `table.criteria` es el de este render, así que se lee de la URL.
   */
  const fetchExportRows = (): Promise<PedidoExportRow[]> => {
    const currentQuery = new URLSearchParams(window.location.search);
    const current = readServerTableState(definition, (key) => currentQuery.get(key));
    return exportOrders({
      ...(toPedidoListApiParams(toServerTableCriteria(definition, current)) as Record<
        string,
        string
      >),
      ...scope,
    });
  };

  return { ...table, fetchExportRows };
};

/**
 * Indicadores de Mesa de Control (`kpis-mesa/`) del MISMO conjunto que la
 * tabla: recibe sus `criteria` (filtros y búsqueda; el orden se descarta).
 * Mientras llegan los de criterios nuevos se conservan los anteriores
 * (`keepPreviousData`), igual que las filas de la tabla.
 */
export const usePedidoKpisMesa = (criteria: Readonly<Record<string, string>>) => {
  const params = toPedidoKpisApiParams(criteria);
  return useGuardedQuery(
    {
      queryKey: pedidoKpisMesaQueryKey(params),
      queryFn: () => getPedidoKpisMesa(params),
      placeholderData: keepPreviousData,
    },
    {
      toastId: "pedido-kpis-mesa-refetch-error",
      errorMessage: "No se pudieron actualizar los indicadores. Se muestran los datos anteriores.",
    },
  );
};

/**
 * ¿El usuario ve importes de pedidos? `puede_ver_importes` de `kpis-mesa/` sin
 * filtros (la regla es por usuario: contabilidad de ventas o de compras,
 * EC-784). Es la misma llave que los indicadores de Mesa sin filtros, así que
 * ahí no cuesta otra petición. Mientras no llega, decide con las filas: el
 * listado QUITA `subtotal`/`gran_total` a quien no los ve, así que una fila
 * con importe basta para saberlo. Sin respuesta ni filas, no se muestran.
 */
export const usePedidoAmountsVisibility = (rows: readonly PedidoListItem[]): boolean => {
  const { data } = useGuardedQuery(
    {
      queryKey: pedidoKpisMesaQueryKey({}),
      queryFn: () => getPedidoKpisMesa({}),
    },
    // Sin toast propio: quien muestra los indicadores ya avisa de sus fallos,
    // y aquí un fallo solo deja la decisión a las filas.
    { toastId: "pedido-amounts-visibility", silent: true },
  );
  if (data !== undefined) return data.puede_ver_importes;
  return rows.some((row) => row.gran_total !== undefined || row.subtotal !== undefined);
};

/**
 * Catálogos de los filtros de encabezado (`opciones/`) de todo el conjunto
 * visible. Los consumen los encabezados con filtro (no la factoría de
 * columnas): la tabla solo tiene una página.
 */
export const usePedidoFilterOptions = (misPedidos = false) =>
  useGuardedQuery(
    {
      queryKey: pedidoFilterOptionsQueryKey(misPedidos),
      queryFn: () => getPedidoFilterOptions(misPedidos ? MIS_PEDIDOS_PARAM : {}),
    },
    {
      toastId: misPedidos ? "pedido-filter-options-mis-refetch-error" : "pedido-filter-options-refetch-error",
      errorMessage: "No se pudieron actualizar las opciones de los filtros.",
    },
  );
