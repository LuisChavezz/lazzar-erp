import {
  dateParam,
  defineServerTable,
  enumParam,
  positiveIdParam,
} from "@/src/utils/serverTableParams";
import {
  RFID_RECONCILIATION_ESTATUS_VALUES,
  RFID_RECONCILIATION_TIPO_ORIGEN_VALUES,
} from "./rfidReconciliations";

/**
 * Contrato del listado con `GET /compras/recepcion-rfid-encuadres/`
 * (nucleo-erp#1442, EC-981): paginación opcional `limit`/`offset` (la tabla
 * siempre la manda), `?search=` (folio de la OC, folio de la OP, nombre y razón
 * social del proveedor, remisión y factura) y `?ordering=` con lista blanca.
 * Un filtro inválido da `400`, por eso cada uno pasa por su codec.
 *
 * - `estatus`: el endpoint acepta varios por coma; el encabezado elige uno.
 * - `fecha_desde`/`fecha_hasta` filtran el DÍA local de `fecha_recepcion`
 *   (la fecha del encuadre), inclusivos.
 * - `sucursal`, `orden_compra` y `op` también son filtros del endpoint, pero la
 *   tabla no los ofrece.
 * - El backend ya desempata por `id` (NULL al final); el `tiebreaker` lo hace
 *   explícito en la llave.
 */
export const rfidReconciliationsTable = defineServerTable({
  filters: {
    estatus: enumParam(RFID_RECONCILIATION_ESTATUS_VALUES),
    tipo_origen: enumParam(RFID_RECONCILIATION_TIPO_ORIGEN_VALUES),
    proveedor: positiveIdParam,
    almacen: positiveIdParam,
    fecha_desde: dateParam,
    fecha_hasta: dateParam,
  },
  dateRanges: [{ from: "fecha_desde", to: "fecha_hasta" }],
  search: { param: "search" },
  ordering: {
    fields: [
      "id",
      "created_at",
      "fecha_recepcion",
      "fecha_aceptacion",
      "estatus",
      "tipo_origen",
      "orden_compra__folio",
      "op__folio_op",
      "proveedor__nombre",
      "almacen__nombre",
    ],
    default: "-created_at",
    tiebreaker: "-id",
  },
});
