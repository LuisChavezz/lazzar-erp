import { isCompleteDateEntry } from "@/src/utils/formatDate";
import { parsePositiveId } from "@/src/utils/parsePositiveId";

/**
 * Estado de una tabla en MODO SERVIDOR (`DataTable` con `server`) y su ida y
 * vuelta con la URL. Todo lo de este archivo es PURO —sin React ni `window`—
 * para que la misma lectura sirva al hook (`useServerTable`), a un "Volver"
 * que reconstruya la URL de una lista y a una página de servidor.
 *
 * La URL es la fuente de verdad y usa los nombres de parámetro del backend
 * (`estado`, `cliente`, `q`, `ordering`) más `page` y `page_size`. `page` es
 * siempre 1-indexada, pagine el endpoint con `page` o con `limit`/`offset`:
 * esa traducción es del adaptador (`serverListAdapters.ts`), no de la URL.
 *
 * Regla que sostiene todo lo demás: cada valor se valida POR SEPARADO y uno
 * inválido se trata como ausente. Nunca se envía al backend ni se reescribe en
 * la URL algo que no pasó por aquí.
 */

/**
 * Cómo se lee y se escribe UN filtro. `parse` recibe el texto crudo de la URL
 * (o el valor que emite un control) y devuelve el valor tipado, o `null` si no
 * es válido; `serialize` lo devuelve a texto, para la URL y para el backend.
 */
export interface ServerTableParam<T> {
  parse(raw: string): T | null;
  serialize(value: T): string;
}

/** Uno de una lista cerrada de textos (un estatus). Compara exacto. */
export const enumParam = <const T extends string>(
  values: readonly T[],
): ServerTableParam<T> => ({
  parse: (raw) => ((values as readonly string[]).includes(raw) ? (raw as T) : null),
  serialize: (value) => value,
});

/** Id entero positivo (una FK: cliente, vendedor). Solo dígitos. */
export const positiveIdParam: ServerTableParam<number> = {
  parse: (raw) => parsePositiveId(raw),
  serialize: (value) => String(value),
};

/** Día real "yyyy-mm-dd" (año ≥ 1900), como lo emite un `<input type="date">`. */
export const dateParam: ServerTableParam<string> = {
  parse: (raw) => (isCompleteDateEntry(raw) ? raw : null),
  serialize: (value) => value,
};

/** Filtros de una tabla: clave del parámetro del endpoint → cómo leerlo. */
export type ServerTableFilterParams = Record<string, ServerTableParam<unknown>>;

/** Valores tipados de los filtros; una clave ausente = sin ese filtro. */
export type ServerTableFilterValues<P extends ServerTableFilterParams> = {
  [K in keyof P]?: P[K] extends ServerTableParam<infer T> ? T : never;
};

/**
 * Contrato de una lista con su endpoint: qué filtros acepta, cómo se llama su
 * parámetro de búsqueda, por qué campos ordena y qué tamaños de página ofrece.
 * Declárala una vez por lista, a nivel de módulo, con `defineServerTable`.
 */
export interface ServerTableDefinition<
  P extends ServerTableFilterParams = ServerTableFilterParams,
> {
  /** Filtros que el endpoint acepta. `{}` si no tiene. */
  filters: P;
  /** Búsqueda de texto. Omitida → la lista no tiene buscador. */
  search?: {
    /** Nombre del parámetro en el endpoint (y en la URL), p. ej. `"q"`. */
    param: string;
    /** Tope de caracteres que se envían. Por defecto 100. */
    maxLength?: number;
  };
  /** Orden. Omitido → la lista no ordena por columna. */
  ordering?: {
    /** Lista blanca de campos del endpoint (sin signo). */
    fields: readonly string[];
    /**
     * Orden por defecto, en formato `ordering` (`"-id"`). Se envía SIEMPRE que
     * el usuario no haya elegido otro, para no depender del default del
     * backend; no hace falta que su campo esté en `fields`.
     */
    default: string;
    /**
     * Desempate fijo, en formato `ordering` (`"-id"`): se AÑADE al orden que
     * se envía al backend (`"monto_estimado,-id"`) para que las filas con el
     * mismo valor no cambien de sitio entre páginas. No se escribe en la URL
     * ni hace falta que su campo esté en `fields`; se omite cuando el orden
     * vigente ya es por ese campo.
     */
    tiebreaker?: string;
  };
  /** Opciones del selector "Filas". Por defecto 10/20/50/100. */
  pageSizes?: readonly number[];
  /** Tamaño de página inicial; debe estar en `pageSizes`. Por defecto 20. */
  defaultPageSize?: number;
  /**
   * Prefijo de los parámetros de ESTA tabla en la URL, para dos tablas de
   * servidor en una misma página (`"op_"` → `?op_page=2`). Al backend se envían
   * sin prefijo.
   */
  urlPrefix?: string;
}

/** Identidad con inferencia: conserva los tipos de cada filtro. */
export const defineServerTable = <const P extends ServerTableFilterParams>(
  definition: ServerTableDefinition<P>,
): ServerTableDefinition<P> => definition;

/** Lo que la URL dice de la tabla, ya validado. */
export interface ServerTableState<P extends ServerTableFilterParams = ServerTableFilterParams> {
  filters: ServerTableFilterValues<P>;
  /** Búsqueda confirmada (recortada). `""` = sin búsqueda. */
  search: string;
  /** Orden elegido por el usuario, o `null` = el orden por defecto. */
  ordering: string | null;
  /** 1-indexada. */
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZES: readonly number[] = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SEARCH_MAX_LENGTH = 100;

export const serverTablePageSizes = (definition: ServerTableDefinition): readonly number[] =>
  definition.pageSizes ?? DEFAULT_PAGE_SIZES;

export const serverTableDefaultPageSize = (definition: ServerTableDefinition): number =>
  definition.defaultPageSize ?? DEFAULT_PAGE_SIZE;

/** Búsqueda como se confirma: sin espacios en los extremos y con tope. */
export const normalizeServerTableSearch = (
  definition: ServerTableDefinition,
  raw: string,
): string =>
  definition.search
    ? // Segundo `trim`: el corte por longitud puede dejar un espacio al final.
      raw.trim().slice(0, definition.search.maxLength ?? DEFAULT_SEARCH_MAX_LENGTH).trim()
    : "";

/**
 * Orden válido o `null`. Es `null` también cuando coincide con el orden por
 * defecto: así "sin orden elegido" tiene una sola representación y la URL de
 * la vista por defecto queda limpia.
 */
export const normalizeServerTableOrdering = (
  definition: ServerTableDefinition,
  raw: string | null | undefined,
): string | null => {
  if (!definition.ordering || !raw) return null;
  const field = raw.startsWith("-") ? raw.slice(1) : raw;
  if (!definition.ordering.fields.includes(field)) return null;
  return raw === definition.ordering.default ? null : raw;
};

/** Orden que realmente rige: el elegido o el por defecto. `null` si la lista no ordena. */
export const effectiveServerTableOrdering = (
  definition: ServerTableDefinition,
  ordering: string | null,
): string | null => (definition.ordering ? ordering ?? definition.ordering.default : null);

/**
 * Siguiente orden al pulsar el encabezado que ordena por `field`:
 * ascendente → descendente → orden por defecto. Si el orden por defecto ya es
 * por ese campo, alterna entre sus dos sentidos (quitarlo devolvería al mismo
 * sitio y el clic parecería no hacer nada). Un campo fuera de la lista blanca
 * no cambia nada.
 */
export const nextServerTableOrdering = (
  definition: ServerTableDefinition,
  ordering: string | null,
  field: string,
): string | null => {
  if (!definition.ordering || !definition.ordering.fields.includes(field)) return ordering;
  const current = ordering ?? definition.ordering.default;
  const descending = `-${field}`;
  const defaultField = definition.ordering.default.replace(/^-/, "");
  let next: string | null;
  if (current === field) next = descending;
  else if (current === descending) next = defaultField === field ? field : null;
  else next = field;
  return normalizeServerTableOrdering(definition, next);
};

const urlKey = (definition: ServerTableDefinition, name: string): string =>
  `${definition.urlPrefix ?? ""}${name}`;

/** Parámetros de la URL que pertenecen a esta tabla (con su prefijo). */
const ownUrlKeys = (definition: ServerTableDefinition): string[] => [
  ...Object.keys(definition.filters),
  ...(definition.search ? [definition.search.param] : []),
  "ordering",
  "page",
  "page_size",
].map((name) => urlKey(definition, name));

/**
 * Lee el estado validando cada valor POR SEPARADO. `get` abstrae la fuente:
 * `URLSearchParams.get` en el cliente o el objeto `searchParams` de una página
 * de servidor.
 */
export const readServerTableState = <P extends ServerTableFilterParams>(
  definition: ServerTableDefinition<P>,
  get: (key: string) => string | null | undefined,
): ServerTableState<P> => {
  const filters: Record<string, unknown> = {};
  for (const name of Object.keys(definition.filters)) {
    const raw = get(urlKey(definition, name));
    if (raw === null || raw === undefined || raw === "") continue;
    const value = definition.filters[name].parse(raw);
    if (value !== null) filters[name] = value;
  }

  const pageSizes = serverTablePageSizes(definition);
  const pageSize = parsePositiveId(get(urlKey(definition, "page_size")));

  return {
    filters: filters as ServerTableFilterValues<P>,
    search: definition.search
      ? normalizeServerTableSearch(definition, get(urlKey(definition, definition.search.param)) ?? "")
      : "",
    ordering: normalizeServerTableOrdering(definition, get(urlKey(definition, "ordering"))),
    page: parsePositiveId(get(urlKey(definition, "page"))) ?? 1,
    pageSize:
      pageSize !== null && pageSizes.includes(pageSize)
        ? pageSize
        : serverTableDefaultPageSize(definition),
  };
};

/** Filtros como texto (clave del endpoint → valor), para la tabla y el backend. */
export const serializeServerTableFilters = <P extends ServerTableFilterParams>(
  definition: ServerTableDefinition<P>,
  filters: ServerTableFilterValues<P>,
): Record<string, string> => {
  const serialized: Record<string, string> = {};
  for (const name of Object.keys(definition.filters)) {
    const value = (filters as Record<string, unknown>)[name];
    if (value === undefined || value === null) continue;
    serialized[name] = definition.filters[name].serialize(value);
  }
  return serialized;
};

/**
 * Estado → query de la URL. Parte de la query ACTUAL para conservar los
 * parámetros que no son de esta tabla (`?from=`, los de otra tabla con otro
 * prefijo) y reescribe solo los propios, con valores ya validados. Los valores
 * por defecto se omiten: la vista por defecto es la URL sin parámetros.
 */
export const writeServerTableQuery = <P extends ServerTableFilterParams>(
  definition: ServerTableDefinition<P>,
  state: ServerTableState<P>,
  current: URLSearchParams,
): URLSearchParams => {
  const query = new URLSearchParams(current);
  for (const key of ownUrlKeys(definition)) query.delete(key);

  const filters = serializeServerTableFilters(definition, state.filters);
  for (const [name, value] of Object.entries(filters)) query.set(urlKey(definition, name), value);
  if (definition.search && state.search !== "") {
    query.set(urlKey(definition, definition.search.param), state.search);
  }
  if (state.ordering !== null) query.set(urlKey(definition, "ordering"), state.ordering);
  if (state.page > 1) query.set(urlKey(definition, "page"), String(state.page));
  if (state.pageSize !== serverTableDefaultPageSize(definition)) {
    query.set(urlKey(definition, "page_size"), String(state.pageSize));
  }
  return query;
};

/**
 * Criterios de la consulta para el backend, SIN paginación: filtros, búsqueda
 * y orden efectivo, con los nombres del endpoint. Es lo que comparten la lista
 * y cualquier consulta hermana sobre el mismo conjunto (un total, un embudo,
 * una exportación).
 */
export const toServerTableCriteria = <P extends ServerTableFilterParams>(
  definition: ServerTableDefinition<P>,
  state: ServerTableState<P>,
): Record<string, string> => {
  const ordering = effectiveServerTableOrdering(definition, state.ordering);
  const tiebreaker = definition.ordering?.tiebreaker;
  const orderingField = (value: string) => value.replace(/^-/, "");
  const sentOrdering =
    ordering !== null && tiebreaker && orderingField(ordering) !== orderingField(tiebreaker)
      ? `${ordering},${tiebreaker}`
      : ordering;
  return {
    ...serializeServerTableFilters(definition, state.filters),
    ...(definition.search && state.search !== "" ? { [definition.search.param]: state.search } : {}),
    ...(sentOrdering !== null ? { ordering: sentOrdering } : {}),
  };
};

/** ¿La consulta lleva filtros o búsqueda? (El orden y la página no cuentan.) */
export const hasServerTableCriteria = (state: ServerTableState): boolean =>
  state.search !== "" || Object.keys(state.filters).length > 0;
