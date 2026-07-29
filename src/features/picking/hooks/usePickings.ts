import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPickings } from "../services/actions";
import type { Picking } from "../interfaces/picking.interface";

/**
 * Lista los pickings (`GET /wms/pickings/`). Llave `["pickings"]`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar `ErrorState`) de un
 * refetch fallido con datos en caché (toast + conservar la tabla). Mismo
 * patrón que `useTransferencias`.
 */
export const usePickings = () => {
  const query = useQuery<Picking[]>({
    queryKey: ["pickings"],
    queryFn: getPickings,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "pickings-refetch-error",
  });

  return {
    pickings: query.data ?? [],
    /**
     * Instante (ms) en que la lista se resolvió por última vez. Lo usa la vista
     * como "ahora" para marcar pickings vencidos: es una lectura PURA en render
     * (a diferencia de `Date.now()`, que el React Compiler prohíbe llamar
     * durante el render) y además es el instante correcto conceptualmente —el
     * vencimiento se evalúa contra el momento en que se trajo el dato, y se
     * reevalúa solo en cada refetch, nunca a media vida de un render—.
     * Vale 0 mientras no haya datos, cuando tampoco hay filas que marcar.
     */
    dataUpdatedAt: query.dataUpdatedAt,
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
