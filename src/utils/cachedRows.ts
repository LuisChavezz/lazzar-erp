import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Escritura en caché del RESULTADO de una acción que cambia el estatus de un
 * registro (EC-927). Sin ella, si la acción tiene éxito pero el refetch que
 * sigue falla, el listado conserva lo cargado (`useHasLoadedQuery`,
 * `useGuardedQuery`) y la fila queda con el estatus viejo y sus acciones
 * disponibles. Mismo orden que Mesa de Control
 * (`applyOperationsQuoteActionResult`): cancelar lo que esté en vuelo,
 * escribir, y después invalidar como siempre (el refetch reconcilia).
 *
 * BEST-EFFORT: se corre dentro del `onSuccess` de la mutación, ANTES de su
 * toast y sus invalidaciones. Una respuesta con otra forma (otro backend
 * desplegado, un campo renombrado) no debe convertir una acción aplicada en un
 * error: nada de aquí lanza. Sin un id válido o sin los campos esperados, no
 * se escribe nada y el refetch queda como única fuente.
 *
 * Funciones PURAS (`patchRowById`, `pickPresentFields`) más envolturas sobre
 * `QueryClient`, para probarlas sin React.
 */

interface RowWithId {
  id: number;
}

/**
 * Opción de los helpers: el campo que identifica el registro. Por omisión `id`;
 * la OP se identifica por `op_id` (su llave primaria; no trae `id`).
 */
export interface CachedRowOptions {
  idField?: string;
}

const recordId = (value: unknown, idField: string): unknown =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>)[idField] : undefined;

/** Las dos formas de listado en caché: arreglo plano o página `{ results }` de DRF. */
type RowsContainer<TRow> = TRow[] | { results: TRow[] };

const asObject = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** El `id` del resultado si es un entero positivo; si no, `null`. */
export const resultRecordId = (value: unknown): number | null => {
  const id = asObject(value)?.id;
  return typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Solo los `fields` que `source` trae (presentes y distintos de `undefined`).
 * Así una respuesta sin un campo nunca escribe `undefined` sobre la fila.
 */
export const pickPresentFields = <TRow>(
  source: unknown,
  fields: readonly (keyof TRow & string)[],
): Partial<TRow> => {
  const object = asObject(source);
  if (!object) return {};
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    if (object[field] !== undefined) picked[field] = object[field];
  }
  return picked as Partial<TRow>;
};

const isPage = <TRow>(value: unknown): value is { results: TRow[] } =>
  asObject(value) !== null && Array.isArray((value as { results?: unknown }).results);

/**
 * Aplica `patch` a la fila con ese `id` (o con ese valor en `idField`), en un
 * arreglo plano o en la página `{ results }` de un listado paginado (el resto
 * de las claves de la página se conserva). Devuelve la MISMA referencia si no
 * hay fila con ese id o si la forma no es ninguna de las dos: quien llama sabe
 * así que no hubo cambio.
 */
export const patchRowById = <TRow extends object = RowWithId>(
  data: unknown,
  id: number,
  patch: (row: TRow) => TRow,
  { idField = "id" }: CachedRowOptions = {},
): unknown => {
  const rows = Array.isArray(data) ? (data as TRow[]) : isPage<TRow>(data) ? data.results : null;
  if (rows === null || !rows.some((row) => recordId(row, idField) === id)) return data;
  const patched = rows.map((row) => (recordId(row, idField) === id ? patch(row) : row));
  return Array.isArray(data) ? patched : { ...(data as object), results: patched };
};

/**
 * Cancela las consultas bajo `queryKey` y aplica `patch` a la fila `id` en
 * CADA variante en caché bajo ese prefijo (filtros, páginas, periodos) que la
 * contenga. Las variantes sin esa fila, o con otra forma (detalle, KPIs), no
 * se tocan: `setQueryData` las marcaría frescas sin haber cambiado nada.
 *
 * Un `id` que no es un entero positivo no escribe nada. Nunca lanza (ver el
 * encabezado). No invalida: cada hook conserva sus invalidaciones de siempre.
 */
export const patchCachedRowById = async <TRow extends object = RowWithId>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  id: unknown,
  patch: (row: TRow) => TRow,
  options: CachedRowOptions = {},
) => {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return;
  try {
    await queryClient.cancelQueries({ queryKey });
    for (const [key, data] of queryClient.getQueriesData<RowsContainer<TRow>>({ queryKey })) {
      const next = patchRowById(data, id, patch, options);
      if (next !== data) queryClient.setQueryData(key, next);
    }
  } catch (error) {
    console.error("No se pudo escribir el resultado de la acción en la caché", error);
  }
};

/**
 * Reemplaza la fila por el registro que respondió la acción, cuando esa
 * respuesta tiene la MISMA forma que la fila del listado (mismo serializer).
 * Solo si trae un `id` válido y todos los `requiredFields`; si no, no escribe.
 */
export const replaceCachedRow = <TRow extends RowWithId>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  record: unknown,
  requiredFields: readonly (keyof TRow & string)[],
) => {
  const complete = requiredFields.every((field) => asObject(record)?.[field] !== undefined);
  return patchCachedRowById<TRow>(
    queryClient,
    queryKey,
    complete ? resultRecordId(record) : null,
    () => record as TRow,
  );
};

/**
 * Fusiona en el DETALLE en caché del registro `id` (la entrada exacta
 * `queryKey`, un objeto, no una lista) los `values` ya elegidos. Solo si esa
 * entrada existe y es el mismo registro (por `id`, o por `idField`); nunca lanza.
 */
export const mergeCachedRecord = async (
  queryClient: QueryClient,
  queryKey: QueryKey,
  id: number,
  values: Record<string, unknown>,
  { idField = "id" }: CachedRowOptions = {},
) => {
  if (Object.keys(values).length === 0) return;
  try {
    await queryClient.cancelQueries({ queryKey, exact: true });
    const current = asObject(queryClient.getQueryData(queryKey));
    if (current?.[idField] !== id) return;
    queryClient.setQueryData(queryKey, { ...current, ...values });
  } catch (error) {
    console.error("No se pudo escribir el resultado de la acción en la caché", error);
  }
};
