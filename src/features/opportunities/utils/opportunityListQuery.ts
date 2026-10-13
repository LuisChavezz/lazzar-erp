import {
  readServerTableState,
  writeServerTableQuery,
  type ServerTableState,
} from "@/src/utils/serverTableParams";
import type { EstadoOportunidad } from "../constants/opportunityChoices";
import {
  OPPORTUNITIES_LIST_PATH,
  OPPORTUNITY_LIST_PARAM,
  opportunityDetailPath,
} from "../constants/opportunityRoutes";
import { opportunitiesTable } from "../hooks/useOpportunitiesTable";

/**
 * El estado del listado (filtros, búsqueda, orden, página) viaja en la URL del
 * DETALLE dentro de UN solo parámetro (`lista`), para que "Volver" —y la salida
 * tras dar de baja— regresen al listado tal como estaba:
 *
 *   /sales/opportunities?estado=Nueva&page=2
 *     → /sales/opportunities/38?lista=estado%3DNueva%26page%3D2
 *     → "Volver" → /sales/opportunities?estado=Nueva&page=2
 *
 * Va en un parámetro propio, y no suelto con los nombres del listado, para no
 * compartir espacio de nombres con los parámetros que el detalle tenga (un
 * `page` de otra tabla, una pestaña) y para poder reenviarlo tal cual a otras
 * pantallas que vuelven al detalle (el pedido, con el origen `opportunities`).
 *
 * Nunca se copia la query cruda a un `href`: se lee con la definición del
 * listado (`opportunitiesTable`), que valida cada valor por separado y descarta
 * lo que no reconoce, y se vuelve a escribir desde ese estado. Una entrada
 * directa al detalle (sin el parámetro) vuelve al listado sin filtros.
 */

type OpportunitiesListState = ServerTableState<typeof opportunitiesTable.filters>;

/** Estado YA validado del listado → su query (sin los valores por defecto). */
export const serializeOpportunitiesListState = (state: OpportunitiesListState): string =>
  writeServerTableQuery(opportunitiesTable, state, new URLSearchParams()).toString();

/** Valor CRUDO del parámetro `lista` de una URL → query del listado, validada. */
export const readOpportunityListParam = (raw: string | string[] | undefined): string => {
  const query = new URLSearchParams((Array.isArray(raw) ? raw[0] : raw) ?? "");
  return serializeOpportunitiesListState(
    readServerTableState(opportunitiesTable, (key) => query.get(key))
  );
};

/**
 * El `estado` filtrado según la URL del navegador EN ESTE MOMENTO, validado.
 * Para decidir en un clic: el estado que da `useServerTable` es el del último
 * render, y Next sincroniza `useSearchParams` un poco después de cada cambio.
 */
export const readCurrentOpportunitiesEstado = (): EstadoOportunidad | undefined => {
  const query = new URLSearchParams(window.location.search);
  return readServerTableState(opportunitiesTable, (key) => query.get(key)).filters.estado;
};

/** `listQuery` debe venir de una de las dos funciones de arriba. */
export const opportunitiesListHref = (listQuery: string): string =>
  listQuery ? `${OPPORTUNITIES_LIST_PATH}?${listQuery}` : OPPORTUNITIES_LIST_PATH;

/** Detalle de una oportunidad, llevando el estado del listado del que se sale. */
export const opportunityDetailHref = (id: number, listQuery: string): string => {
  const path = opportunityDetailPath(id);
  if (!listQuery) return path;
  return `${path}?${new URLSearchParams({ [OPPORTUNITY_LIST_PARAM]: listQuery }).toString()}`;
};

/** El listado filtrado por un `estado`, sin nada más (página 1, orden por defecto). */
export const opportunitiesListHrefForEstado = (estado: EstadoOportunidad): string =>
  opportunitiesListHref(
    serializeOpportunitiesListState(
      readServerTableState(opportunitiesTable, (key) => (key === "estado" ? estado : null))
    )
  );
