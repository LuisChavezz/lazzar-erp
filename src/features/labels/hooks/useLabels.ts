import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { MOCK_LABELS } from "../mocks/labels.mock";
import type { Label } from "../interfaces/label.interface";

/**
 * Lista las etiquetas. Llave `["labels"]`.
 *
 * MAQUETA: no hay endpoint todavía, así que el `queryFn` resuelve el fixture
 * local en vez de llamar a `v1_api`. Se mantiene deliberadamente dentro de
 * `useQuery` —en lugar de importar `MOCK_LABELS` directo en la vista— para que
 * el contrato que consume `LabelsView` (`isLoading`/`isError`/`refetch`/
 * `hasLoaded`) sea EXACTAMENTE el de cualquier otro listado del proyecto: el
 * día que exista `GET /produccion/etiquetas/` solo cambia el `queryFn` por la
 * acción correspondiente, sin reestructurar el árbol de componentes.
 */
export const useLabels = () => {
  const query = useQuery<Label[]>({
    queryKey: ["labels"],
    queryFn: async () => MOCK_LABELS,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "labels-refetch-error",
  });

  return {
    labels: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
