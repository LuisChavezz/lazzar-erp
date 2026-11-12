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

/**
 * Uno o varios de una lista cerrada de textos, separados por coma (`?estatus=3,4`,
 * `?clasificacion=A,B`), para los endpoints que aceptan un CSV. Todo o nada: un
 * solo elemento fuera de la lista (o vacío) invalida el valor entero, porque el
 * backend responde 400 por él. Los repetidos se quitan y el orden es el de
 * `values`, así que `"4,3"` y `"3,4"` son el mismo filtro (y la misma llave).
 * Un solo valor (`"3"`) es válido: un filtro de encabezado de selección única
 * escribe exactamente eso.
 */
export const csvEnumParam = <const T extends string>(
  values: readonly T[],
): ServerTableParam<T[]> => ({
  parse: (raw) => {
    const parts = raw.split(",");
    if (parts.some((part) => !(values as readonly string[]).includes(part))) return null;
    return values.filter((value) => parts.includes(value));
  },
  serialize: (value) => value.join(","),
});

/** Id entero positivo (una FK: cliente, vendedor). Solo dígitos. */
export const positiveIdParam: ServerTableParam<number> = {
  parse: (raw) => parsePositiveId(raw),
  serialize: (value) => String(value),
};

/**
 * Texto libre que el backend compara EXACTO (un nombre, un código, un color
 * tal como los entrega su catálogo de opciones). No recorta ni normaliza: un
 * espacio de más cambia la coincidencia, así que el valor viaja tal cual. Solo
 * descarta el texto vacío o hecho solo de espacios, que no coincidiría con
 * nada.
 */
export const textParam: ServerTableParam<string> = {
  parse: (raw) => (raw.trim() === "" ? null : raw),
  serialize: (value) => value,
};

/**
 * Mes "AAAA-MM" (01 a 12, año ≥ 1900 como `dateParam`), como el `?mes=` de los
 * filtros por mes. Sin el piso, un año como 0000 llegaría al backend y Django
 * respondería 500 al armar la fecha.
 */
export const monthParam: ServerTableParam<string> = {
  parse: (raw) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(raw) && raw >= "1900-01" ? raw : null),
  serialize: (value) => value,
};

/**
 * Entero entre `min` y `max` (inclusivos), solo dígitos: para parámetros
 * numéricos con rango que el backend valida (`?semanas=1..104`). Un valor
 * fuera del rango es inválido, igual que uno que no sea número.
 */
export const intRangeParam = (min: number, max: number): ServerTableParam<number> => ({
  parse: (raw) => {
    if (!/^\d{1,9}$/.test(raw)) return null;
    const value = Number(raw);
    return value >= min && value <= max ? value : null;
  },
  serialize: (value) => String(value),
});

/**
 * Bandera booleana que solo cuenta encendida (`?solo_candidatos=true`):
 * `"true"` es el único valor válido y apagada se representa con su AUSENCIA,
 * no con `"false"`, para que "sin filtro" tenga una sola forma en la URL.
 */
export const booleanFlagParam: ServerTableParam<true> = {
  parse: (raw) => (raw === "true" ? true : null),
  serialize: () => "true",
};

/**
 * Codec de fecha: lleva la marca `kind: "date"` para que `dateRanges` acepte
 * SOLO filtros de fecha (su comparación es por texto "yyyy-mm-dd", que no
 * sirve para otros valores).
 */
export interface DateServerTableParam extends ServerTableParam<string> {
  readonly kind: "date";
}

/** Día real "yyyy-mm-dd" (año ≥ 1900), como lo emite un `<input type="date">`. */
export const dateParam: DateServerTableParam = {
  kind: "date",
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
 * Un AJUSTE de la consulta: un parámetro del endpoint que no filtra el conjunto
 * sino que cambia cómo se calcula (`?semanas=12`, `?agrupar=producto`). A
 * diferencia de un filtro siempre tiene valor —`default` cuando la URL no trae
 * uno válido—, se envía siempre, no cuenta como criterio activo y "Limpiar
 * filtros" (`clear`) no lo toca. En la URL solo se escribe si difiere de
 * `default`.
 */
export interface ServerTableSetting<T> {
  param: ServerTableParam<T>;
  default: T;
}

/** Identidad con inferencia para declarar un ajuste (`settings` de la definición). */
export const serverTableSetting = <T>(
  param: ServerTableParam<T>,
  defaultValue: T,
): ServerTableSetting<T> => ({ param, default: defaultValue });

/** Ajustes de una tabla: clave del parámetro del endpoint → codec y default. */
export type ServerTableSettingParams = Record<string, ServerTableSetting<unknown>>;

/** Sin ajustes: el caso de todas las tablas que no declaran `settings`. */
export type NoServerTableSettings = Record<never, never>;

/** Valores tipados de los ajustes: siempre presentes (el default si no hay otro). */
export type ServerTableSettingValues<S extends ServerTableSettingParams> = {
  [K in keyof S]: S[K] extends ServerTableSetting<infer T> ? T : never;
};

/**
 * Contrato de una lista con su endpoint: qué filtros acepta, cómo se llama su
 * parámetro de búsqueda, por qué campos ordena y qué tamaños de página ofrece.
 * Declárala una vez por lista, a nivel de módulo, con `defineServerTable`.
 */
export interface ServerTableDefinition<
  P extends ServerTableFilterParams = ServerTableFilterParams,
  S extends ServerTableSettingParams = NoServerTableSettings,
> {
  /** Filtros que el endpoint acepta. `{}` si no tiene. */
  filters: P;
  /**
   * Ajustes de la consulta (`ServerTableSetting`). Omitido → la tabla no tiene
   * ajustes y todo se comporta como antes de que existieran.
   */
  settings?: S;
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
    /**
     * `true`: sin orden elegido por el usuario NO se envía `ordering` y rige el
     * del backend. Para un endpoint cuyo orden por defecto no se puede expresar
     * con `?ordering=` (cotizaciones: `-created_at` con los nulos AL FINAL,
     * mientras `?ordering=-created_at` los pone primero). `default` sigue
     * diciendo qué orden es ese, para el encabezado y el ciclo de clics. Por
     * defecto `false`: el comportamiento de siempre.
     */
    omitDefault?: boolean;
  };
  /**
   * Pares de filtros de fecha (`dateParam`) que forman un RANGO: `from` no
   * puede ser posterior a `to` (el backend responde 400). Un par invertido en
   * la URL se trata como ausente —ninguno de los dos se envía— y un cambio que
   * lo invertiría no se escribe. Omitido → ningún par se compara. Las dos
   * claves deben ser filtros `dateParam` de `filters` (lo comprueba
   * `defineServerTable`): la comparación es por el texto "yyyy-mm-dd".
   */
  dateRanges?: readonly { from: string; to: string }[];
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

/** Claves de `P` cuyos filtros son de fecha (`dateParam`). */
type DateFilterKey<P extends ServerTableFilterParams> = {
  [K in keyof P]: P[K] extends DateServerTableParam ? K : never;
}[keyof P] &
  string;

/**
 * Identidad con inferencia: conserva los tipos de cada filtro. Un par de
 * `dateRanges` que nombre un filtro que no sea `dateParam` no compila.
 */
export const defineServerTable = <
  const P extends ServerTableFilterParams,
  const S extends ServerTableSettingParams = NoServerTableSettings,
>(
  definition: ServerTableDefinition<P, S> & {
    dateRanges?: readonly { from: DateFilterKey<P>; to: DateFilterKey<P> }[];
  },
): ServerTableDefinition<P, S> => definition;

/** Definición con cualquier filtro y cualquier ajuste, para las funciones internas. */
type AnyServerTableDefinition = ServerTableDefinition<
  ServerTableFilterParams,
  ServerTableSettingParams
>;

interface ServerTableBaseState<P extends ServerTableFilterParams> {
  filters: ServerTableFilterValues<P>;
  /** Búsqueda confirmada (recortada). `""` = sin búsqueda. */
  search: string;
  /** Orden elegido por el usuario, o `null` = el orden por defecto. */
  ordering: string | null;
  /** 1-indexada. */
  page: number;
  pageSize: number;
}

/**
 * Lo que la URL dice de la tabla, ya validado. `settings` es obligatorio solo
 * en las tablas que declaran ajustes; en las demás es opcional, así que un
 * estado armado a mano (sin `settings`) sigue siendo válido.
 */
export type ServerTableState<
  P extends ServerTableFilterParams = ServerTableFilterParams,
  S extends ServerTableSettingParams = NoServerTableSettings,
> = ServerTableBaseState<P> &
  (keyof S extends never
    ? { settings?: ServerTableSettingValues<S> }
    : { settings: ServerTableSettingValues<S> });

/** Ajustes del estado como registro suelto (`{}` si la tabla no tiene). */
const settingsOf = (state: { settings?: unknown }): Readonly<Record<string, unknown>> =>
  (state.settings ?? {}) as Record<string, unknown>;

/** `[clave, ajuste]` de la definición; vacío si no declara `settings`. */
const settingEntries = (definition: AnyServerTableDefinition) =>
  Object.entries(definition.settings ?? {}) as [string, ServerTableSetting<unknown>][];

/** Valores por defecto de todos los ajustes. */
export const defaultServerTableSettings = <S extends ServerTableSettingParams>(
  definition: ServerTableDefinition<ServerTableFilterParams, S>,
): ServerTableSettingValues<S> =>
  Object.fromEntries(
    settingEntries(definition as AnyServerTableDefinition).map(([key, setting]) => [
      key,
      setting.default,
    ]),
  ) as ServerTableSettingValues<S>;

/**
 * Ajustes como texto (clave del endpoint → valor), TODOS, también los que
 * están en su default: es lo que se envía al backend, para no depender de sus
 * propios defaults. Un ajuste ausente del estado cuenta con su default.
 */
export const serializeServerTableSettings = (
  definition: AnyServerTableDefinition,
  settings: Readonly<Record<string, unknown>>,
): Record<string, string> => {
  const serialized: Record<string, string> = {};
  for (const [key, setting] of settingEntries(definition)) {
    const value = settings[key] ?? setting.default;
    serialized[key] = setting.param.serialize(value);
  }
  return serialized;
};

/** ¿Todos los ajustes están en su default? (`true` si la tabla no tiene.) */
export const areServerTableSettingsDefault = (
  definition: AnyServerTableDefinition,
  settings: Readonly<Record<string, unknown>>,
): boolean =>
  settingEntries(definition).every(
    ([key, setting]) =>
      setting.param.serialize(settings[key] ?? setting.default) ===
      setting.param.serialize(setting.default),
  );

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
const ownUrlKeys = (definition: AnyServerTableDefinition): string[] => [
  ...Object.keys(definition.filters),
  ...Object.keys(definition.settings ?? {}),
  ...(definition.search ? [definition.search.param] : []),
  "ordering",
  "page",
  "page_size",
].map((name) => urlKey(definition, name));

/**
 * Rangos de `definition.dateRanges` con los dos extremos presentes y `from`
 * posterior a `to`. Compara el texto serializado: `dateParam` emite
 * "yyyy-mm-dd", que ordena igual como texto que como fecha.
 */
const invertedServerTableRanges = (
  definition: ServerTableDefinition,
  filters: Readonly<Record<string, unknown>>,
) =>
  (definition.dateRanges ?? []).filter(({ from, to }) => {
    const fromValue = filters[from];
    const toValue = filters[to];
    if (fromValue === undefined || fromValue === null || toValue === undefined || toValue === null) {
      return false;
    }
    return (
      definition.filters[from].serialize(fromValue) > definition.filters[to].serialize(toValue)
    );
  });

/** ¿Los filtros respetan todos los rangos de `definition.dateRanges`? */
export const areServerTableRangesValid = <P extends ServerTableFilterParams>(
  definition: ServerTableDefinition<P>,
  filters: ServerTableFilterValues<P>,
): boolean => invertedServerTableRanges(definition, filters).length === 0;

/**
 * Lee el estado validando cada valor POR SEPARADO. `get` abstrae la fuente:
 * `URLSearchParams.get` en el cliente o el objeto `searchParams` de una página
 * de servidor.
 */
export const readServerTableState = <
  P extends ServerTableFilterParams,
  S extends ServerTableSettingParams = NoServerTableSettings,
>(
  definition: ServerTableDefinition<P, S>,
  get: (key: string) => string | null | undefined,
): ServerTableState<P, S> => {
  const filters: Record<string, unknown> = {};
  for (const name of Object.keys(definition.filters)) {
    const raw = get(urlKey(definition, name));
    if (raw === null || raw === undefined || raw === "") continue;
    const value = definition.filters[name].parse(raw);
    if (value !== null) filters[name] = value;
  }

  // Un rango invertido no es "uno de los dos válido": no hay forma de saber
  // cuál sobra, así que se descartan ambos.
  for (const range of invertedServerTableRanges(definition, filters)) {
    delete filters[range.from];
    delete filters[range.to];
  }

  const pageSizes = serverTablePageSizes(definition);
  const pageSize = parsePositiveId(get(urlKey(definition, "page_size")));

  // Cada ajuste por separado: uno inválido (o ausente) toma su default.
  const settingEntriesOfDefinition = settingEntries(definition as AnyServerTableDefinition);
  const settings: Record<string, unknown> = {};
  for (const [name, setting] of settingEntriesOfDefinition) {
    const raw = get(urlKey(definition, name));
    const value = raw === null || raw === undefined || raw === "" ? null : setting.param.parse(raw);
    settings[name] = value ?? setting.default;
  }

  return {
    // Solo las tablas con ajustes llevan la clave: el estado de las demás
    // queda idéntico al de antes de que existieran.
    ...(settingEntriesOfDefinition.length > 0 ? { settings } : {}),
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
  } as ServerTableState<P, S>;
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
export const writeServerTableQuery = <
  P extends ServerTableFilterParams,
  S extends ServerTableSettingParams = NoServerTableSettings,
>(
  definition: ServerTableDefinition<P, S>,
  state: ServerTableState<P, S>,
  current: URLSearchParams,
): URLSearchParams => {
  const query = new URLSearchParams(current);
  const anyDefinition = definition as AnyServerTableDefinition;
  for (const key of ownUrlKeys(anyDefinition)) query.delete(key);

  // Ajustes: solo los que difieren de su default (la vista por defecto queda
  // sin parámetros).
  const settings = settingsOf(state);
  for (const [name, setting] of settingEntries(anyDefinition)) {
    const value = setting.param.serialize(settings[name] ?? setting.default);
    if (value !== setting.param.serialize(setting.default)) query.set(urlKey(definition, name), value);
  }

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
 * Query CANÓNICA de una tabla a partir de la del navegador: sus propios
 * parámetros reescritos con valores ya validados (un orden fuera de la lista
 * blanca, un filtro inválido o un ajuste en su default desaparecen) y, además,
 * sin `foreignKeys` (las claves de una definición hermana que esta no usa).
 * Los parámetros ajenos a la tabla (`?from=`) se conservan.
 */
export const canonicalServerTableQuery = <
  P extends ServerTableFilterParams,
  S extends ServerTableSettingParams = NoServerTableSettings,
>(
  definition: ServerTableDefinition<P, S>,
  current: URLSearchParams,
  foreignKeys: readonly string[] = [],
): URLSearchParams => {
  const state = readServerTableState(definition, (key) => current.get(key));
  const query = writeServerTableQuery(definition, state, current);
  for (const key of foreignKeys) query.delete(urlKey(definition, key));
  return query;
};

/** ¿Las dos queries tienen los mismos parámetros, sin importar su orden? */
export const isSameServerTableQuery = (a: URLSearchParams, b: URLSearchParams): boolean => {
  const sorted = (query: URLSearchParams) => {
    const copy = new URLSearchParams(query);
    copy.sort();
    return copy.toString();
  };
  return sorted(a) === sorted(b);
};

/**
 * Estado con todos los ajustes en su default y la página 1. Si ya estaban
 * todos en su default devuelve el MISMO estado (`===`): "Restablecer" no debe
 * escribir la URL ni cambiar de página cuando no hay nada que restablecer.
 */
export const resetServerTableSettingsState = <
  P extends ServerTableFilterParams,
  S extends ServerTableSettingParams,
>(
  definition: ServerTableDefinition<P, S>,
  state: ServerTableState<P, S>,
): ServerTableState<P, S> =>
  areServerTableSettingsDefault(definition as AnyServerTableDefinition, settingsOf(state))
    ? state
    : { ...state, settings: defaultServerTableSettings(definition), page: 1 };

/**
 * Criterios de la consulta para el backend, SIN paginación: filtros, búsqueda
 * y orden efectivo, con los nombres del endpoint. Es lo que comparten la lista
 * y cualquier consulta hermana sobre el mismo conjunto (un total, un embudo,
 * una exportación).
 */
export const toServerTableCriteria = <
  P extends ServerTableFilterParams,
  S extends ServerTableSettingParams = NoServerTableSettings,
>(
  definition: ServerTableDefinition<P, S>,
  state: ServerTableState<P, S>,
): Record<string, string> => {
  const ordering =
    definition.ordering?.omitDefault && state.ordering === null
      ? null
      : effectiveServerTableOrdering(definition, state.ordering);
  const tiebreaker = definition.ordering?.tiebreaker;
  const orderingField = (value: string) => value.replace(/^-/, "");
  const sentOrdering =
    ordering !== null && tiebreaker && orderingField(ordering) !== orderingField(tiebreaker)
      ? `${ordering},${tiebreaker}`
      : ordering;
  return {
    // Los ajustes van SIEMPRE (también en su default); `{}` sin ajustes.
    ...serializeServerTableSettings(definition as AnyServerTableDefinition, settingsOf(state)),
    ...serializeServerTableFilters(definition, state.filters),
    ...(definition.search && state.search !== "" ? { [definition.search.param]: state.search } : {}),
    ...(sentOrdering !== null ? { ordering: sentOrdering } : {}),
  };
};

/**
 * ¿Es la vista por defecto? Página 1, tamaño de página por defecto, sin
 * filtros, sin búsqueda, con el orden por defecto (`ordering === null`) y, si
 * la tabla tiene ajustes, todos en su default. Es la única llave que
 * `useServerTable` conserva más tiempo con `cacheDefaultView`.
 */
export const isServerTableDefaultView = (
  definition: AnyServerTableDefinition,
  state: ServerTableBaseState<ServerTableFilterParams> & { settings?: unknown },
): boolean =>
  areServerTableSettingsDefault(definition, settingsOf(state)) &&
  !hasServerTableCriteria(state) &&
  state.ordering === null &&
  state.page === 1 &&
  state.pageSize === serverTableDefaultPageSize(definition);

/** ¿La consulta lleva filtros o búsqueda? (El orden y la página no cuentan.) */
export const hasServerTableCriteria = (
  state: Pick<ServerTableBaseState<ServerTableFilterParams>, "search" | "filters">,
): boolean =>
  state.search !== "" || Object.keys(state.filters).length > 0;
