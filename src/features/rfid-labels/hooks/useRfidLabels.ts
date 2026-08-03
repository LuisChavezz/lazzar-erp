import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getEtiquetasRFID } from "../services/actions";
import type { EtiquetaRFID } from "../interfaces/rfid-label.interface";

/**
 * Lista los eventos de impresión de etiquetas RFID (`GET /wms/etiquetas-rfid/`).
 * Llave `["etiquetas-rfid"]`.
 */
export const useRfidLabels = () => {
  const query = useQuery<EtiquetaRFID[]>({
    queryKey: ["etiquetas-rfid"],
    queryFn: getEtiquetasRFID,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "etiquetas-rfid-refetch-error",
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
