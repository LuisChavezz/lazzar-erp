import {
  defineServerTable,
  enumParam,
  monthParam,
  positiveIdParam,
  textParam,
} from "@/src/utils/serverTableParams";

/**
 * Catálogos cerrados de `existencias/por-almacen/` (nucleo-erp EC-774), en el
 * orden de los menús. Única fuente: los tipos (`StockEstado`,
 * `StockExistenciasRango`) y los codecs de la tabla salen de aquí.
 */

/** Valores de `?existencias=` (rangos de piezas). */
export const STOCK_EXISTENCIAS_RANGOS = ["cero", "1-10", "11-100", "mas-100"] as const;

/** Valores de `?estado=` y de `row.estado`. */
export const STOCK_ESTADOS = ["full", "ok", "low", "critical"] as const;

/**
 * Contrato de la tabla de existencias con `GET /inventarios/existencias/por-almacen/`
 * (nucleo-erp EC-774). El almacén (`?almacen=` en la URL, `almacen_id` en el
 * backend) NO es un filtro de la tabla: lo elige el selector de almacén, va en
 * la llave de la consulta y cambiarlo reinicia todo lo de aquí (ver
 * `StockView`). Así "Limpiar filtros" nunca lo quita.
 *
 * - `nombre`, `tipo` y `color` se comparan EXACTO y distinguiendo mayúsculas
 *   contra el valor crudo de `resumen.opciones` (`textParam` no lo altera).
 * - `ubicacion` es el `id_ubicacion`; `existencias` y `estado`, catálogos
 *   cerrados; `mes`, "AAAA-MM" en hora de México.
 * - `search` busca en nombre y SKU (producto, variante y muestra).
 * - `ordering`: la lista blanca del backend menos `id`, que va como desempate.
 *   El default reproduce el suyo (`-fecha_actualizacion,-id`); el backend deja
 *   los NULL al final en ambos sentidos.
 */
export const stockPorAlmacenTable = defineServerTable({
  filters: {
    nombre: textParam,
    tipo: textParam,
    color: textParam,
    ubicacion: positiveIdParam,
    existencias: enumParam(STOCK_EXISTENCIAS_RANGOS),
    mes: monthParam,
    estado: enumParam(STOCK_ESTADOS),
  },
  search: { param: "search" },
  ordering: {
    fields: ["sku", "nombre", "tipo", "color", "stock", "fecha_actualizacion", "ubicacion_nombre"],
    default: "-fecha_actualizacion",
    tiebreaker: "-id",
  },
});
