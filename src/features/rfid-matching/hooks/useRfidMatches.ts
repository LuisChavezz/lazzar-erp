import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { listRfidMatches } from "../mocks/rfid-matches.mock";
import type { RfidMatch } from "../interfaces/rfid-matching.interface";

/** Llave del listado. Se exporta porque las mutaciones publican en ella. */
export const RFID_MATCHES_QUERY_KEY = ["rfid-matches"] as const;

/**
 * Lista los encuadres RFID. Llave `["rfid-matches"]`.
 *
 * MAQUETA: no hay endpoint todavía, así que el `queryFn` resuelve el estado
 * local de `mocks/rfid-matches.mock.ts`. Se mantiene deliberadamente dentro de
 * `useQuery` —en lugar de leer el módulo directo desde la vista— para que el
 * contrato que consumen `RfidMatchesView`/`RfidMatchDetailDialog`
 * (`isLoading`/`isError`/`refetch`/`hasLoaded`) sea EXACTAMENTE el de
 * cualquier otro listado del proyecto: el día que exista
 * `GET /compras/encuadres-rfid/` solo cambia el `queryFn`. Mismo criterio que
 * `useLabels`.
 *
 * El `queryFn` LEE el estado vigente en cada llamada (no una constante
 * congelada), así que el botón de refrescar de `DataTable` devuelve el avance
 * de escaneo del operador en vez de borrarlo.
 */
export const useRfidMatches = () => {
  const query = useQuery<RfidMatch[]>({
    queryKey: RFID_MATCHES_QUERY_KEY,
    queryFn: async () => listRfidMatches(),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "rfid-matches-refetch-error",
  });

  return {
    matches: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
