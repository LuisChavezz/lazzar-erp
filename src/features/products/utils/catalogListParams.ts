import {
  booleanParam,
  defineServerTable,
  enumParam,
  positiveIdParam,
  type ServerTableDefinition,
  type ServerTableFilterParams,
} from "@/src/utils/serverTableParams";
import { CATEGORIA_LINEAS } from "../../product-categories/constants/categoriaLinea";

/**
 * Contrato de las tablas de catálogo de Producción y Configuración en MODO
 * SERVIDOR (EC-897) con `GET /catalogo/producto/` y
 * `GET /catalogo/producto-variante/` (EC-886 y EC-896). Todo es puro (sin
 * React) para poder probarlo.
 *
 * Los filtros usan los nombres del endpoint, salvo el RANGO de precio
 * (`rango_precio`): un filtro de encabezado escribe UNA clave y un rango son dos
 * parámetros del backend (`precio_base_min` inclusivo, `precio_base_max`
 * exclusivo). La URL guarda la opción elegida y `toCatalogListApiParams` la
 * traduce justo antes de pedir, así que nunca llega al backend una clave que
 * no conoce. Mismo esquema que `toPedidoListApiParams`.
 */

/** Opción del filtro de precio y los parámetros del backend que le tocan. */
export interface CatalogPriceRangeOption {
  value: string;
  label: string;
  params: Readonly<Record<string, string>>;
}

/**
 * Los mismos rangos que tenían las tablas en modo cliente, que ya comparaban
 * con el mínimo inclusivo y el máximo exclusivo (`matchesRangeFilter`), igual
 * que el backend: $100 cae en "$100 – $500" y $500 en "Más de $500". Contiguos
 * y sin huecos: todo precio cae en exactamente uno.
 */
export const CATALOG_PRICE_RANGE_OPTIONS: readonly CatalogPriceRangeOption[] = [
  { value: "hasta-100", label: "Hasta $100", params: { precio_base_max: "100" } },
  {
    value: "100-500",
    label: "$100 – $500",
    params: { precio_base_min: "100", precio_base_max: "500" },
  },
  { value: "mas-500", label: "Más de $500", params: { precio_base_min: "500" } },
];

/** Clave de la URL del filtro de precio (no es un parámetro del backend). */
export const PRICE_RANGE_FILTER = "rango_precio";

const priceRangeParam = enumParam(CATALOG_PRICE_RANGE_OPTIONS.map((option) => option.value));

/**
 * Parámetros de la tabla → parámetros del endpoint: `rango_precio` se
 * sustituye por sus `precio_base_*` y el resto pasa igual. Una opción que no
 * existe se descarta (su codec ya no la deja llegar aquí).
 */
export const toCatalogListApiParams = <T extends string | number>(
  params: Readonly<Record<string, T>>,
): Record<string, T | string> => {
  const apiParams: Record<string, T | string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== PRICE_RANGE_FILTER) {
      apiParams[key] = value;
      continue;
    }
    const option = CATALOG_PRICE_RANGE_OPTIONS.find((candidate) => candidate.value === String(value));
    if (option) Object.assign(apiParams, option.params);
  }
  return apiParams;
};

/**
 * Valor de `?linea=` que el backend resuelve como línea vacía O sin categoría
 * (`categoria_producto IS NULL`): una sola opción "Sin línea (materia prima)"
 * para los dos casos.
 */
export const SIN_LINEA_FILTER_VALUE = "SIN_LINEA";

/**
 * `GET /catalogo/producto/`:
 *
 * - Solo productos activos (el backend no acepta `activo`): por eso la tabla no
 *   filtra por Estado. Tampoco por Nombre: lo cubre la búsqueda (`q`, sobre
 *   nombre, código y código Proscai).
 * - `linea`: una línea de `CategoriaProducto.Linea` o `SIN_LINEA`.
 * - `ordering`: las columnas, todas en la lista blanca; el default reproduce
 *   el del backend (`-created_at, -id`). Estado no ordena: todas son activas. Categoría y Línea ordenan por nombre y
 *   línea de la categoría, con los vacíos al final en ambas direcciones.
 * - `tipo_id` no se expone: lo fija quien monta la tabla (`useProductsTable`).
 */
export const productsTable = defineServerTable({
  filters: {
    categoria_producto: positiveIdParam,
    linea: enumParam([...CATEGORIA_LINEAS, SIN_LINEA_FILTER_VALUE]),
    con_cod_proscai: booleanParam,
    [PRICE_RANGE_FILTER]: priceRangeParam,
  },
  search: { param: "q" },
  ordering: {
    fields: [
      "nombre",
      "codigo",
      "cod_proscai",
      "categoria_producto__nombre",
      "categoria_producto__linea",
      "precio_base",
    ],
    default: "-created_at",
    tiebreaker: "-id",
  },
});

/**
 * `GET /catalogo/producto-variante/`: activas e inactivas (sin `activo`),
 * orden por defecto `-id`. `producto`, `color` y `talla` aceptan varios ids,
 * pero el filtro de encabezado elige uno. Producto, color y talla ordenan por
 * su nombre (la talla en su orden canónico, CH, M, G…).
 */
export const productVariantsTable = defineServerTable({
  filters: {
    activo: booleanParam,
    producto: positiveIdParam,
    color: positiveIdParam,
    talla: positiveIdParam,
    [PRICE_RANGE_FILTER]: priceRangeParam,
  },
  search: { param: "q" },
  ordering: {
    fields: ["activo", "sku", "producto__nombre", "color__nombre", "talla__nombre", "precio_base"],
    default: "-id",
    tiebreaker: "-id",
  },
});

/**
 * La misma definición con un prefijo en la URL, para montarla en
 * Configuración: ahí varias tablas en modo servidor comparten `/config` (la
 * vista elegida no va en la URL), y sin prefijo una heredaría la búsqueda o la
 * página que otra dejó. Al backend los parámetros se envían sin prefijo.
 */
export const withUrlPrefix = <P extends ServerTableFilterParams>(
  definition: ServerTableDefinition<P>,
  urlPrefix: string,
): ServerTableDefinition<P> => ({ ...definition, urlPrefix });
