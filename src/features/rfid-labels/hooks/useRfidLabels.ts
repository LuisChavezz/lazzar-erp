import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { MOCK_RFID_LABELS } from "../mocks/rfid-labels.mock";
import type { RfidLabel } from "../interfaces/rfid-label.interface";

/**
 * Lista las etiquetas RFID. Llave `["rfid-labels"]`.
 *
 * MAQUETA: no hay endpoint todavía, así que el `queryFn` resuelve el fixture
 * local en vez de llamar a `v1_api`. Se mantiene deliberadamente dentro de
 * `useQuery` —en lugar de importar `MOCK_RFID_LABELS` directo en la vista— para
 * que el contrato que consume `RfidLabelsView` (`isLoading`/`isError`/`refetch`/
 * `hasLoaded`) sea EXACTAMENTE el de cualquier otro listado del proyecto: el
 * día que exista el endpoint real solo cambia el `queryFn` por la acción
 * correspondiente, sin reestructurar el árbol de componentes.
 */
export const useRfidLabels = () => {
  const query = useQuery<RfidLabel[]>({
    queryKey: ["rfid-labels"],
    queryFn: async () => MOCK_RFID_LABELS,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "rfid-labels-refetch-error",
  });

  return {
    rfidLabels: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
