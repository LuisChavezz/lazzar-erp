import { readServerTableState, writeServerTableQuery } from "@/src/utils/serverTableParams";
import { stockPorAlmacenTable } from "../constants/stockPorAlmacen";

/** Parámetro de la URL con el almacén de la pantalla de existencias. */
export const STOCK_ALMACEN_PARAM = "almacen";

/**
 * Query de la URL al cambiar de almacén, o `null` si no hay nada que cambiar
 * (ya es ese almacén, o ya no hay ninguno).
 *
 * Reinicia la tabla en la misma escritura —filtros, búsqueda, orden y página;
 * las opciones de los filtros son de cada almacén— con las mismas funciones
 * con las que `useServerTable` lee y escribe su estado, así que la lista de
 * claves propias nunca se separa de la del hook. Conserva el tamaño de página
 * y los parámetros ajenos a la tabla. `nextAlmacenId` en `null` quita el
 * almacén.
 */
export const nextStockAlmacenQuery = (
  current: URLSearchParams,
  nextAlmacenId: number | null,
): URLSearchParams | null => {
  const currentAlmacen = current.get(STOCK_ALMACEN_PARAM);
  if (nextAlmacenId === null ? currentAlmacen === null : currentAlmacen === String(nextAlmacenId)) {
    return null;
  }

  const { pageSize } = readServerTableState(stockPorAlmacenTable, (key) => current.get(key));
  const query = writeServerTableQuery(
    stockPorAlmacenTable,
    { filters: {}, search: "", ordering: null, page: 1, pageSize },
    current,
  );
  if (nextAlmacenId === null) query.delete(STOCK_ALMACEN_PARAM);
  else query.set(STOCK_ALMACEN_PARAM, String(nextAlmacenId));
  return query;
};
