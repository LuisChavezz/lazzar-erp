import {
  readServerTableState,
  writeServerTableQuery,
  type ServerTableState,
} from "@/src/utils/serverTableParams";
import {
  CUSTOMER_LIST_PARAM,
  CUSTOMERS_LIST_PATH,
  customerDetailPath,
} from "../constants/customerRoutes";
import { customersTable } from "./customerList";

/**
 * El estado del listado (búsqueda, orden, página, tamaño) viaja en la URL del
 * DETALLE dentro de UN solo parámetro (`lista`), para que "Volver" regrese al
 * listado tal como estaba. Mismo patrón que `opportunityListQuery`:
 *
 *   /sales/customers?search=3338&page=2
 *     → /sales/customers/98?lista=search%3D3338%26page%3D2
 *     → "Volver" → /sales/customers?search=3338&page=2
 *
 * Nunca se copia la query cruda a un `href`: se lee con la definición del
 * listado (`customersTable`), que valida cada valor y descarta lo que no
 * reconoce, y se vuelve a escribir desde ese estado. Una entrada directa al
 * detalle (sin el parámetro) vuelve al listado por defecto.
 */

type CustomersListState = ServerTableState<typeof customersTable.filters>;

/** Estado YA validado del listado → su query (sin los valores por defecto). */
export const serializeCustomersListState = (state: CustomersListState): string =>
  writeServerTableQuery(customersTable, state, new URLSearchParams()).toString();

/** Valor CRUDO del parámetro `lista` de una URL → query del listado, validada. */
export const readCustomerListParam = (raw: string | string[] | undefined): string => {
  const query = new URLSearchParams((Array.isArray(raw) ? raw[0] : raw) ?? "");
  return serializeCustomersListState(readServerTableState(customersTable, (key) => query.get(key)));
};

/** `listQuery` debe venir de una de las dos funciones de arriba. */
export const customersListHref = (listQuery = ""): string =>
  listQuery ? `${CUSTOMERS_LIST_PATH}?${listQuery}` : CUSTOMERS_LIST_PATH;

/** Detalle de un cliente, llevando el estado del listado del que se sale. */
export const customerDetailHref = (id: number | string, listQuery = ""): string => {
  const path = customerDetailPath(id);
  if (!listQuery) return path;
  return `${path}?${new URLSearchParams({ [CUSTOMER_LIST_PARAM]: listQuery }).toString()}`;
};
