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
 * Funciones PURAS (`patchRowById`) más una envoltura sobre `QueryClient`, para
 * probarlas sin React.
 */

interface RowWithId {
  id: number;
}

/** Las dos formas de listado en caché: arreglo plano o página `{ results }` de DRF. */
type RowsContainer<TRow> = TRow[] | { results: TRow[] };

const isPage = <TRow>(value: unknown): value is { results: TRow[] } =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Array.isArray((value as { results?: unknown }).results);

/**
 * Aplica `patch` a la fila con ese `id`, en un arreglo plano o en la página
 * `{ results }` de un listado paginado (el resto de las claves de la página se
 * conserva). Devuelve la MISMA referencia si no hay fila con ese id o si la
 * forma no es ninguna de las dos: quien llama sabe así que no hubo cambio.
 */
export const patchRowById = <TRow extends RowWithId>(
  data: unknown,
  id: number,
  patch: (row: TRow) => TRow,
): unknown => {
  const rows = Array.isArray(data) ? (data as TRow[]) : isPage<TRow>(data) ? data.results : null;
  if (rows === null || !rows.some((row) => row?.id === id)) return data;
  const patched = rows.map((row) => (row?.id === id ? patch(row) : row));
  return Array.isArray(data) ? patched : { ...(data as object), results: patched };
};

/**
 * Cancela las consultas bajo `queryKey` y aplica `patch` a la fila `id` en
 * CADA variante en caché bajo ese prefijo (filtros, páginas, periodos) que la
 * contenga. Las variantes sin esa fila, o con otra forma (detalle, KPIs), no
 * se tocan: `setQueryData` las marcaría frescas sin haber cambiado nada.
 *
 * No invalida: cada hook conserva sus invalidaciones de siempre.
 */
export const patchCachedRowById = async <TRow extends RowWithId>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  id: number,
  patch: (row: TRow) => TRow,
) => {
  await queryClient.cancelQueries({ queryKey });
  for (const [key, data] of queryClient.getQueriesData<RowsContainer<TRow>>({ queryKey })) {
    const next = patchRowById(data, id, patch);
    if (next !== data) queryClient.setQueryData(key, next);
  }
};
