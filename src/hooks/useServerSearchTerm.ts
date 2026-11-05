import { useDebounce } from "./useDebounce";

/**
 * Término de una búsqueda que pega al SERVIDOR: el texto tecleado, recortado
 * y debounced (`term`, lo que viaja en la petición), más `isDebouncing`: el
 * usuario sigue tecleando y `term` todavía no alcanza al texto. Un consumidor
 * con `keepPreviousData` arma su "hay una búsqueda en camino" con
 * `isDebouncing || isPlaceholderData`: lo pintado es de la búsqueda anterior.
 *
 * El texto en sí sigue siendo estado del consumidor (puede filtrar en memoria
 * con el texto en vivo, como `PurchaseOrderProductLinesList`), y el retraso es
 * suyo: cada buscador conserva el que ya tenía.
 */
export function useServerSearchTerm(search: string, delayMs: number) {
  const trimmed = search.trim();
  const term = useDebounce(trimmed, delayMs);
  return { term, isDebouncing: term !== trimmed };
}
