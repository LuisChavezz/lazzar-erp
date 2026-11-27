"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useServerTable } from "@/src/hooks/useServerTable";
import { pageNumberAdapter } from "@/src/utils/serverListAdapters";
import type {
  SurtidoPedido,
  SurtidoPedidoPorSurtir,
} from "@/src/features/order-fulfillment/interfaces/order-fulfillment.interface";
import {
  getSurtidoPedidosFiltros,
  getSurtidoPedidosPage,
  getSurtidoPedidosResumen,
} from "@/src/features/order-fulfillment/services/actions";
import {
  porSurtirTable,
  surtidosTable,
  WMS_ORDERS_RESUMEN_KEY,
  WMS_ORDERS_SET_PARAMS,
  wmsOrdersFiltrosKey,
  wmsOrdersListKey,
  type WmsOrdersTab,
} from "../constants/wmsOrdersTables";

// A nivel de módulo: referencias estables entre renders.
const porSurtirAdapter = pageNumberAdapter<SurtidoPedidoPorSurtir>();
const surtidosAdapter = pageNumberAdapter<SurtidoPedido>();

// Los parámetros fijos del conjunto van DESPUÉS de los de la tabla: ningún
// filtro de la URL puede pisarlos.
const getPorSurtirPage = (params: Record<string, string | number>) =>
  getSurtidoPedidosPage<SurtidoPedidoPorSurtir>({ ...params, ...WMS_ORDERS_SET_PARAMS["por-surtir"] });
const getSurtidosPage = (params: Record<string, string | number>) =>
  getSurtidoPedidosPage<SurtidoPedido>({ ...params, ...WMS_ORDERS_SET_PARAMS.surtidos });

/**
 * "Por surtir" de Pedidos de Almacén en MODO SERVIDOR: lo que ofrece el
 * onboarding de picking, sin el tope de 50. Estado en la URL con prefijo
 * `ps_`; la página lo envuelve en `<Suspense>`.
 */
export const usePorSurtirTable = () =>
  useServerTable({
    definition: porSurtirTable,
    queryKey: wmsOrdersListKey("por-surtir"),
    queryFn: getPorSurtirPage,
    adapter: porSurtirAdapter,
    toastId: "wms-orders-por-surtir-refetch-error",
    refetchErrorMessage: "No se pudieron actualizar los pedidos por surtir. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudieron cargar los pedidos por surtir.",
  });

/** "Surtidos" (surtido completo, cualquier estatus) en MODO SERVIDOR, prefijo `sd_`. */
export const useSurtidosTable = () =>
  useServerTable({
    definition: surtidosTable,
    queryKey: wmsOrdersListKey("surtidos"),
    queryFn: getSurtidosPage,
    adapter: surtidosAdapter,
    toastId: "wms-orders-surtidos-refetch-error",
    refetchErrorMessage: "No se pudieron actualizar los pedidos surtidos. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudieron cargar los pedidos surtidos.",
  });

/**
 * Contadores de las pestañas (`resumen/`): todo lo visible, sin filtros, en una
 * consulta. No depende de qué pestaña está montada.
 */
export const useWmsOrdersResumen = () =>
  useGuardedQuery(
    { queryKey: WMS_ORDERS_RESUMEN_KEY, queryFn: getSurtidoPedidosResumen },
    { toastId: "wms-orders-resumen-refetch-error" },
  );

/** Clientes y sucursales del conjunto de la pestaña, para los filtros de encabezado. */
export const useWmsOrdersFiltros = (tab: WmsOrdersTab) =>
  useGuardedQuery(
    {
      queryKey: wmsOrdersFiltrosKey(tab),
      queryFn: () => getSurtidoPedidosFiltros(WMS_ORDERS_SET_PARAMS[tab]),
    },
    { toastId: `wms-orders-filtros-${tab}-refetch-error` },
  );
