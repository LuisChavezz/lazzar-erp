import {
  defineServerTable,
  enumParam,
  positiveIdParam,
  type ServerTableFilterValues,
} from "@/src/utils/serverTableParams";
import { STOCK_DIGITAL_QUERY_KEY } from "@/src/constants/stockQueryKeys";

/**
 * Prefijo de las consultas del stock digital (lista y detalle). Vive en
 * `stockQueryKeys` para que `invalidateStockQueries` lo relea tras un picking,
 * un traspaso, una cancelación de pedido…
 */
export const DIGITAL_STOCK_KEY = STOCK_DIGITAL_QUERY_KEY;

/** Módulo que monta la pantalla: decide el origen de los folios y los textos. */
export type DigitalStockModule = "sales" | "operations";

/** Valores de `?solo=` que acepta el backend (`FILTROS_SOLO`). */
export const DIGITAL_STOCK_SOLO_VALUES = [
  "disponibles",
  "faltantes",
  "comprometidos",
  "entradas",
  "existencia",
] as const;

export type DigitalStockSoloValue = (typeof DIGITAL_STOCK_SOLO_VALUES)[number];

/**
 * Contrato del listado con `GET /ventas/stock-digital/` (nucleo-erp #1415):
 * - `q`: SKU, nombre de la variante o del producto.
 * - `solo`: ver `DIGITAL_STOCK_SOLO_VALUES`; su ausencia significa "todos".
 * - `categoria`, `color`, `talla`, `sucursal`: ids enteros.
 * - Sin `ordering`: el orden es fijo (`sku, pk`) y el endpoint ignora `?ordering`.
 * - Paginación `page`/`page_size` (máx. 200 en el backend; uno mayor se recorta).
 *
 * `producto` y `variantes` también existen en el endpoint, pero esta pantalla
 * no los ofrece (EC-977).
 */
export const digitalStockTable = defineServerTable({
  filters: {
    solo: enumParam(DIGITAL_STOCK_SOLO_VALUES),
    categoria: positiveIdParam,
    color: positiveIdParam,
    talla: positiveIdParam,
    sucursal: positiveIdParam,
  },
  search: { param: "q" },
  pageSizes: [20, 50, 100, 200],
  defaultPageSize: 50,
});

export type DigitalStockFilterValues = ServerTableFilterValues<
  (typeof digitalStockTable)["filters"]
>;

export type DigitalStockFilterKey = keyof DigitalStockFilterValues;

/** Atajos de `?solo=`, en el orden en que se muestran. */
export const DIGITAL_STOCK_SOLO_CHIPS: ReadonlyArray<{
  value: DigitalStockSoloValue;
  label: string;
  dotClassName: string;
}> = [
  { value: "disponibles", label: "Disponibles", dotClassName: "bg-emerald-500" },
  { value: "faltantes", label: "Faltantes", dotClassName: "bg-rose-500" },
  { value: "comprometidos", label: "Comprometidos", dotClassName: "bg-amber-500" },
  { value: "entradas", label: "Con entradas", dotClassName: "bg-indigo-500" },
  { value: "existencia", label: "Con existencia", dotClassName: "bg-sky-500" },
];

/** Llave del chip "Todos" (sin `?solo=`). */
export const DIGITAL_STOCK_SOLO_ALL = "todos";

/** Texto de la columna de existencia: deja claro que solo es ALM-00. */
export const EXISTENCIA_ALM00_LABEL = "Existencia ALM-00";

/**
 * Explicación de la existencia ALM-00. Solo en Mesa de Control se compara con
 * "Existencias, Producción y Compras": en Ventas esa pantalla no existe.
 */
export const existenciaAlm00Hint = (module: DigitalStockModule): string =>
  module === "operations"
    ? "Piezas en ALM-00, el almacén de surtido de los pedidos. No incluye otros almacenes de producto terminado, por eso puede diferir de \"Existencias, Producción y Compras\"."
    : "Piezas en ALM-00, el almacén de surtido de los pedidos. No incluye otros almacenes de producto terminado.";
