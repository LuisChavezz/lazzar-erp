"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import {
  dateParam,
  defineServerTable,
  enumParam,
  positiveIdParam,
} from "@/src/utils/serverTableParams";
import { TIPO_COMPRA_VALUES } from "@/src/features/purchase-orders/constants/purchaseOrderTipoCompra";
import { RECEIPT_ESTATUS_LABELS } from "@/src/features/receipts/constants/receiptStatus";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { getPurchaseOrderReceiptsPage } from "../services/actions";

/**
 * Prefijo de las consultas de recepciones de compra. La tabla vive en
 * `["purchase-order-receipts", "list", params]`: las mutaciones que ya
 * invalidan `["purchase-order-receipts"]` (alta de recepción, inspección de
 * calidad) la refrescan junto con los indicadores (`[..., "kpis"]`).
 */
export const PURCHASE_ORDER_RECEIPTS_KEY = ["purchase-order-receipts"] as const;

/** Estatus de `Recepcion.EstatusRecepcion`, como viajan en `?estatus=`. */
export const RECEIPT_ESTATUS_VALUES = Object.keys(RECEIPT_ESTATUS_LABELS);

/**
 * Contrato del listado con `GET /compras/recepciones/?tipo_origen=OC`
 * (nucleo-erp #863). `tipo_origen` no es un filtro de la tabla: lo fija la
 * acción (`getPurchaseOrderReceiptsPage`).
 *
 * - `estatus` es UN solo valor y `proveedor` un id; `tipo_compra` (MP/PT, de
 *   la OC de origen) ya lo aceptaba el endpoint.
 * - `fecha_desde`/`fecha_hasta` filtran el DÍA local (America/Mexico_City) de
 *   `fecha_recepcion`, inclusivos; `dateRanges` detiene un rango invertido.
 * - `ordering`: los campos de las columnas, todos en la lista blanca del
 *   backend; el default reproduce el suyo (`-fecha_recepcion, -id`).
 * - OC de origen y almacén NO son filtros: el endpoint no los acepta.
 */
export const purchaseOrderReceiptsTable = defineServerTable({
  filters: {
    estatus: enumParam(RECEIPT_ESTATUS_VALUES),
    proveedor: positiveIdParam,
    tipo_compra: enumParam(TIPO_COMPRA_VALUES),
    fecha_desde: dateParam,
    fecha_hasta: dateParam,
  },
  dateRanges: [{ from: "fecha_desde", to: "fecha_hasta" }],
  search: { param: "search" },
  ordering: {
    fields: [
      "folio",
      "orden_compra__folio",
      "orden_compra__tipo_compra",
      "proveedor__nombre",
      "almacen__nombre",
      "fecha_recepcion",
    ],
    default: "-fecha_recepcion",
    tiebreaker: "-id",
  },
});

// A nivel de módulo: una referencia estable entre renders.
const purchaseOrderReceiptsAdapter = limitOffsetAdapter<PurchaseOrderReceipt>();

/** Listado de recepciones de compra en modo servidor (estado en la URL). */
export const usePurchaseOrderReceiptsTable = () =>
  useServerTable({
    definition: purchaseOrderReceiptsTable,
    queryKey: PURCHASE_ORDER_RECEIPTS_KEY,
    queryFn: getPurchaseOrderReceiptsPage,
    adapter: purchaseOrderReceiptsAdapter,
    toastId: "purchase-order-receipts-table-refetch-error",
    refetchErrorMessage:
      "No se pudieron actualizar las recepciones. Se muestran los datos anteriores.",
  });
