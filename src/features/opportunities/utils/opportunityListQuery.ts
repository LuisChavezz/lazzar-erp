import {
  readServerTableState,
  writeServerTableQuery,
  type ServerTableState,
} from "@/src/utils/serverTableParams";
import { OPPORTUNITIES_LIST_PATH, opportunityDetailPath } from "../constants/opportunityRoutes";
import { opportunitiesTable } from "../hooks/useOpportunitiesTable";

/**
 * El estado del listado (filtros, búsqueda, orden, página) viaja en la URL del
 * DETALLE con sus mismos nombres de parámetro, para que "Volver" —y la salida
 * tras dar de baja— regresen al listado tal como estaba:
 *
 *   /sales/opportunities?estado=Nueva&page=2
 *     → /sales/opportunities/38?estado=Nueva&page=2
 *     → "Volver" → /sales/opportunities?estado=Nueva&page=2
 *
 * Nunca se copia la query cruda a un `href`: se lee con la definición del
 * listado (`opportunitiesTable`), que valida cada valor por separado y descarta
 * lo que no reconoce, y se vuelve a escribir desde ese estado. Una entrada
 * directa al detalle (sin parámetros) vuelve al listado sin filtros.
 */

type OpportunitiesListState = ServerTableState<typeof opportunitiesTable.filters>;

/** Estado YA validado del listado → su query (sin los valores por defecto). */
export const serializeOpportunitiesListState = (state: OpportunitiesListState): string =>
  writeServerTableQuery(opportunitiesTable, state, new URLSearchParams()).toString();

/** Parámetros crudos de una URL → query del listado, validada. */
export const readOpportunitiesListQuery = (
  searchParams: Record<string, string | string[] | undefined>
): string =>
  serializeOpportunitiesListState(
    readServerTableState(opportunitiesTable, (key) => {
      const value = searchParams[key];
      return Array.isArray(value) ? value[0] : value;
    })
  );

/** `listQuery` debe venir de una de las dos funciones de arriba. */
export const opportunitiesListHref = (listQuery: string): string =>
  listQuery ? `${OPPORTUNITIES_LIST_PATH}?${listQuery}` : OPPORTUNITIES_LIST_PATH;

/** Detalle de una oportunidad, llevando el estado del listado del que se sale. */
export const opportunityDetailHref = (id: number, listQuery: string): string =>
  listQuery ? `${opportunityDetailPath(id)}?${listQuery}` : opportunityDetailPath(id);
