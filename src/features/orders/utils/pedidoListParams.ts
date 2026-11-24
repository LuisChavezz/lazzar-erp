import {
  booleanFlagParam,
  booleanParam,
  csvEnumParam,
  defineServerTable,
  enumParam,
  monthParam,
  positiveIdParam,
  type ServerTableDefinition,
  type ServerTableFilterParams,
  type ServerTableParam,
} from "@/src/utils/serverTableParams";
import { PEDIDO_CLASIFICACIONES, PEDIDO_ESTATUS } from "../constants/pedidoStatus";

/**
 * Contrato de las listas de pedidos en MODO SERVIDOR con `GET /ventas/pedidos/`
 * (nucleo-erp #969, EC-782): Mesa de Control, Compras › Pedidos y Mis pedidos.
 * Todo es puro (sin React) para poder probarlo.
 *
 * Los filtros usan los nombres del endpoint, salvo los RANGOS (`rango_*`): un
 * filtro de encabezado escribe UNA clave, y un rango son dos parámetros del
 * backend (`piezas_min`/`piezas_max`, mínimo inclusivo y máximo exclusivo) o
 * `muestras`. La URL guarda la opción elegida (`?rango_piezas=51-500`) y
 * `toPedidoListApiParams` la traduce justo antes de pedir —en la lista, en los
 * indicadores y en la exportación—, así que nunca llega al backend una clave
 * que no conoce.
 */

/** Opción de un filtro por rango y los parámetros del backend que le tocan. */
export interface PedidoRangeOption {
  value: string;
  label: string;
  params: Readonly<Record<string, string>>;
}

/** Piezas (todas las tallas, muestras incluidas) y, en el mismo embudo, muestras. */
export const PIEZAS_RANGE_OPTIONS: readonly PedidoRangeOption[] = [
  { value: "1-50", label: "1 a 50 piezas", params: { piezas_max: "51" } },
  { value: "51-500", label: "51 a 500 piezas", params: { piezas_min: "51", piezas_max: "501" } },
  { value: "mas-500", label: "Más de 500 piezas", params: { piezas_min: "501" } },
  { value: "muestras-con", label: "Con muestras", params: { muestras: "con" } },
  { value: "muestras-solo", label: "Solo muestras", params: { muestras: "solo" } },
  { value: "muestras-sin", label: "Sin muestras", params: { muestras: "sin" } },
];

/** Importe sin IVA de Mesa de Control (`subtotal`). Sin símbolo: la fila no trae el código. */
export const SUBTOTAL_RANGE_OPTIONS: readonly PedidoRangeOption[] = [
  { value: "hasta-10k", label: "Hasta 10,000", params: { subtotal_max: "10000" } },
  {
    value: "10k-100k",
    label: "10,000 – 100,000",
    params: { subtotal_min: "10000", subtotal_max: "100000" },
  },
  { value: "mas-100k", label: "Más de 100,000", params: { subtotal_min: "100000" } },
];

/**
 * Total de Compras › Pedidos (`gran_total`). "Sin importe" es `< 0.01`: los
 * importes llevan dos decimales, así que es lo mismo que "0.00".
 */
export const GRAN_TOTAL_RANGE_OPTIONS: readonly PedidoRangeOption[] = [
  { value: "cero", label: "Sin importe (0.00)", params: { gran_total_max: "0.01" } },
  {
    value: "hasta-10k",
    label: "Hasta 10,000",
    params: { gran_total_min: "0.01", gran_total_max: "10000" },
  },
  {
    value: "10k-100k",
    label: "10,000 – 100,000",
    params: { gran_total_min: "10000", gran_total_max: "100000" },
  },
  { value: "mas-100k", label: "Más de 100,000", params: { gran_total_min: "100000" } },
];

/** Clave de la URL de cada rango → sus opciones. */
const RANGE_FILTERS: Readonly<Record<string, readonly PedidoRangeOption[]>> = {
  rango_piezas: PIEZAS_RANGE_OPTIONS,
  rango_subtotal: SUBTOTAL_RANGE_OPTIONS,
  rango_gran_total: GRAN_TOTAL_RANGE_OPTIONS,
};

const rangeParam = (options: readonly PedidoRangeOption[]) =>
  enumParam(options.map((option) => option.value));

/** "AAAA-MM" de `fecha_confirmacion`, o `"sin_confirmar"`. */
export const SIN_CONFIRMAR = "sin_confirmar";
const mesConfirmacionParam: ServerTableParam<string> = {
  parse: (raw) => (raw === SIN_CONFIRMAR ? raw : monthParam.parse(raw)),
  serialize: (value) => value,
};

/** `?confirmado=`: según `fecha_confirmacion` (no el booleano `por_confirmar`). */
const confirmadoParam = enumParam(["true", "false"]);

/** Los cinco estatus de `Pedido` como viajan en `?estatus=` (CSV). */
export const PEDIDO_ESTATUS_VALUES = Object.values(PEDIDO_ESTATUS).map(String);

/**
 * Opción VIRTUAL «Sin clasificación» del filtro de clasificación (solo Mis
 * pedidos): `?clasificacion=sin_clasificar` en la URL. El backend no la acepta
 * en `clasificacion` (un valor que no es código da 400): se cambia por
 * `sin_clasificar=true` y no se envía `clasificacion`
 * (`SALES_VIRTUAL_FILTER_VALUES`).
 */
export const SIN_CLASIFICACION = "sin_clasificar";

/**
 * Valores VIRTUALES de un filtro: clave de la URL → valor → los parámetros del
 * backend que lo sustituyen (la clave original no se envía). A diferencia de
 * los rangos (`RANGE_FILTERS`, comunes a todas las listas), son de UNA lista:
 * cada una pasa los suyos a `toPedidoListApiParams`, y quien no pasa ninguno
 * envía sus filtros tal cual aunque su códec llegara a aceptar el valor.
 */
export type PedidoVirtualFilterValues = Readonly<
  Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>
>;

/** Los de Mis pedidos (`salesPedidosTable`). */
export const SALES_VIRTUAL_FILTER_VALUES: PedidoVirtualFilterValues = {
  clasificacion: { [SIN_CLASIFICACION]: { sin_clasificar: "true" } },
};

const NO_VIRTUAL_FILTER_VALUES: PedidoVirtualFilterValues = {};

const clasificacionCsvParam = csvEnumParam(PEDIDO_CLASIFICACIONES);

/**
 * Clasificación de Mis pedidos: los códigos (CSV, como Mesa de Control) o la
 * opción virtual `SIN_CLASIFICACION`, nunca mezclados (el backend combinaría
 * `sin_clasificar` y `clasificacion` con AND y no quedaría nada). El valor se
 * normaliza con el mismo orden que `csvEnumParam`.
 */
const clasificacionOrSinParam: ServerTableParam<string> = {
  parse: (raw) => {
    if (raw === SIN_CLASIFICACION) return raw;
    const codes = clasificacionCsvParam.parse(raw);
    return codes ? clasificacionCsvParam.serialize(codes) : null;
  },
  serialize: (value) => value,
};

/**
 * Parámetros de la tabla → parámetros del endpoint: cada `rango_*` se
 * sustituye por los suyos, cada valor virtual de `virtualValues` (solo los de
 * la lista que llama, p. ej. `SALES_VIRTUAL_FILTER_VALUES`) por los suyos y el
 * resto pasa igual. Una opción de rango que no
 * existe se descarta (su codec ya no la deja llegar aquí).
 */
export const toPedidoListApiParams = <T extends string | number>(
  params: Readonly<Record<string, T>>,
  virtualValues: PedidoVirtualFilterValues = NO_VIRTUAL_FILTER_VALUES,
): Record<string, T | string> => {
  const apiParams: Record<string, T | string> = {};
  for (const [key, value] of Object.entries(params)) {
    const virtual = virtualValues[key]?.[String(value)];
    if (virtual) {
      Object.assign(apiParams, virtual);
      continue;
    }
    const options = RANGE_FILTERS[key];
    if (!options) {
      apiParams[key] = value;
      continue;
    }
    const option = options.find((candidate) => candidate.value === String(value));
    if (option) Object.assign(apiParams, option.params);
  }
  return apiParams;
};

/**
 * Criterios para los indicadores (`kpis-mesa/`): los de la tabla traducidos y
 * SIN `ordering`, que no cambia los conteos y solo partiría la caché.
 */
export const toPedidoKpisApiParams = (
  criteria: Readonly<Record<string, string>>,
): Record<string, string> => {
  const rest = Object.fromEntries(Object.entries(criteria).filter(([key]) => key !== "ordering"));
  return toPedidoListApiParams(rest) as Record<string, string>;
};

/** Filtros de la URL que son rangos de importe. */
const AMOUNT_FILTER_KEYS = ["rango_subtotal", "rango_gran_total"];
/** Campos de `ordering` que son importes. */
const AMOUNT_SORT_FIELDS = ["subtotal", "gran_total"];

const sinImportes = new WeakMap<ServerTableDefinition, ServerTableDefinition>();

/**
 * La misma definición SIN los rangos de importe ni el orden por importe, para
 * quien no ve importes de pedidos (EC-784): el backend ignora en silencio esos
 * parámetros para él, así que con la definición completa la URL, el estado
 * ("filtros activos") y los indicadores dirían que aplican cuando no. Con esta,
 * un `rango_*` o un `ordering=subtotal` de la URL se trata como ausente: no se
 * envía y no cuenta como criterio. Misma referencia en cada llamada (la cachea
 * por definición), para no cambiar de identidad entre renders.
 */
export const withoutAmountCriteria = <P extends ServerTableFilterParams>(
  definition: ServerTableDefinition<P>,
): ServerTableDefinition<P> => {
  const cached = sinImportes.get(definition);
  if (cached) return cached as ServerTableDefinition<P>;
  const filters = Object.fromEntries(
    Object.entries(definition.filters).filter(([key]) => !AMOUNT_FILTER_KEYS.includes(key)),
  ) as P;
  const stripped: ServerTableDefinition<P> = {
    ...definition,
    filters,
    ...(definition.ordering
      ? {
          ordering: {
            ...definition.ordering,
            fields: definition.ordering.fields.filter((field) => !AMOUNT_SORT_FIELDS.includes(field)),
          },
        }
      : {}),
  };
  sinImportes.set(definition, stripped);
  return stripped;
};

// Ordenar por estos campos existe en el backend (`ordering`) y coincide con lo
// que pinta la celda (anotaciones de `PedidoListSerializer`). "Programado" NO:
// la celda suma las parcialidades válidas (enteras positivas) y el backend
// `piezas_programadas` suma cualquier cantidad numérica, sin devolverla.
const SORT_DEFAULT = "-created_at";
const SORT_TIEBREAKER = "-id";

/** Mesa de Control (`/operations/orders`). */
export const mesaPedidosTable = defineServerTable({
  filters: {
    confirmado: confirmadoParam,
    cliente: positiveIdParam,
    vendedor: positiveIdParam,
    mes: monthParam,
    clasificacion: csvEnumParam(PEDIDO_CLASIFICACIONES),
    rango_piezas: rangeParam(PIEZAS_RANGE_OPTIONS),
    rango_subtotal: rangeParam(SUBTOTAL_RANGE_OPTIONS),
    // Retención de Mesa de Control (nucleo-erp#1352): con sus dos valores.
    retenido: booleanParam,
    // Programados sin picking vivo: solo encendido (ver `SIN_SURTIR_FILTER_OPTIONS`).
    sin_surtir: booleanFlagParam,
  },
  search: { param: "q" },
  ordering: {
    fields: [
      "folio",
      "cliente_razon_social",
      "piezas",
      "piezas_surtidas",
      "vendedor_nombre",
      "created_at",
      "clasificacion",
      "subtotal",
    ],
    default: SORT_DEFAULT,
    tiebreaker: SORT_TIEBREAKER,
  },
});

/** Compras › Pedidos (`/procurement/orders`). */
export const procurementPedidosTable = defineServerTable({
  filters: {
    estatus: csvEnumParam(PEDIDO_ESTATUS_VALUES),
    cliente: positiveIdParam,
    mes: monthParam,
    mes_confirmacion: mesConfirmacionParam,
    rango_gran_total: rangeParam(GRAN_TOTAL_RANGE_OPTIONS),
  },
  search: { param: "q" },
  ordering: {
    fields: ["folio", "cliente_razon_social", "created_at", "fecha_confirmacion", "gran_total"],
    default: SORT_DEFAULT,
    tiebreaker: SORT_TIEBREAKER,
  },
});

/**
 * Mis pedidos (`/sales/orders`): la búsqueda por fecha de la tabla en memoria
 * se sustituye por el filtro `mes` (el `q` del backend no busca en fechas).
 * `estatus` incluye «Cancelado» (`5`): es la única forma de ver los
 * cancelados, que la vista por defecto no trae (el backend solo los devuelve
 * con `estatus=5` explícito). La clasificación admite «Sin clasificación»
 * (`SIN_CLASIFICACION`).
 */
export const salesPedidosTable = defineServerTable({
  filters: {
    estatus: csvEnumParam(PEDIDO_ESTATUS_VALUES),
    confirmado: confirmadoParam,
    mes: monthParam,
    clasificacion: clasificacionOrSinParam,
  },
  search: { param: "q" },
  ordering: {
    fields: [
      "folio",
      "estatus",
      "cliente_razon_social",
      "piezas",
      "vendedor_nombre",
      "created_at",
      "fecha_confirmacion",
      "clasificacion",
      "subtotal",
    ],
    default: SORT_DEFAULT,
    tiebreaker: SORT_TIEBREAKER,
  },
});
