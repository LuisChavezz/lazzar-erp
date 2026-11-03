"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import {
  dateParam,
  defineServerTable,
  enumParam,
  positiveIdParam,
} from "@/src/utils/serverTableParams";
import { PURCHASE_ORDER_STATUS } from "../constants/purchaseOrderStatus";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { getPurchaseOrdersPage } from "../services/actions";

/**
 * Prefijo de las consultas de órdenes de compra. La tabla vive en
 * `["purchase-orders", "list", params]`, así que las mutaciones que ya
 * invalidan `["purchase-orders"]` la refrescan (todas las páginas y filtros)
 * sin escribir su caché. El listado completo del dashboard y los selectores
 * sigue en la llave exacta `["purchase-orders"]` (`usePurchaseOrders`).
 */
export const PURCHASE_ORDERS_KEY = ["purchase-orders"] as const;

/** Estatus de `OrdenCompra.EstatusOrdenCompra`, como viajan en `?estatus=`. */
export const PURCHASE_ORDER_ESTATUS_VALUES = Object.values(PURCHASE_ORDER_STATUS).map(String);

/**
 * Contrato del listado con `GET /compras/ordenes/` (nucleo-erp #863).
 *
 * - `estatus` es UN solo valor; `proveedor`, un id. Un valor inválido el
 *   backend lo rechaza con 400, por eso cada uno pasa por su codec.
 * - `fecha_desde`/`fecha_hasta` filtran `fecha_oc`, inclusivos; un rango
 *   invertido es otro 400 y `dateRanges` lo detiene antes.
 * - `ordering`: solo los campos de las columnas que se muestran, todos en la
 *   lista blanca del backend. Ninguno es un importe: el listado no los pinta
 *   (el backend ignora en silencio ordenar por un importe sin permiso de
 *   contabilidad). El default reproduce el del backend (`-fecha_oc, -id`);
 *   el desempate por `id` evita filas repetidas o perdidas entre páginas.
 * - `tipo_compra`, cantidad y vencimiento NO son filtros: el endpoint no los
 *   acepta (los ignoraría en silencio).
 */
export const purchaseOrdersTable = defineServerTable({
  filters: {
    estatus: enumParam(PURCHASE_ORDER_ESTATUS_VALUES),
    proveedor: positiveIdParam,
    fecha_desde: dateParam,
    fecha_hasta: dateParam,
  },
  dateRanges: [{ from: "fecha_desde", to: "fecha_hasta" }],
  search: { param: "search" },
  ordering: {
    fields: [
      "folio",
      "proveedor__nombre",
      "tipo_compra",
      "fecha_oc",
      "total_piezas",
      "fecha_vencimiento",
    ],
    default: "-fecha_oc",
    tiebreaker: "-id",
  },
});

// A nivel de módulo: una referencia estable entre renders.
const purchaseOrdersAdapter = limitOffsetAdapter<PurchaseOrder>();

/** Listado de órdenes de compra en modo servidor (estado en la URL). */
export const usePurchaseOrdersTable = () =>
  useServerTable({
    definition: purchaseOrdersTable,
    queryKey: PURCHASE_ORDERS_KEY,
    queryFn: getPurchaseOrdersPage,
    adapter: purchaseOrdersAdapter,
    toastId: "purchase-orders-table-refetch-error",
    refetchErrorMessage:
      "No se pudieron actualizar las órdenes de compra. Se muestran los datos anteriores.",
  });
