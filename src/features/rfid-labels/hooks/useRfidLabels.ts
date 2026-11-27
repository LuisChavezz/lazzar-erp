import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getEtiquetasRFID } from "../services/actions";
import { RFID_LABELS_KEY } from "../constants/rfidLabelQueryKeys";
import type { EtiquetaRFIDRow } from "../interfaces/rfid-label.interface";

/**
 * Lista los eventos de impresión de etiquetas RFID (`GET /wms/etiquetas-rfid/`).
 * Llave `["etiquetas-rfid"]`.
 */
export const useRfidLabels = () => {
  const query = useQuery<EtiquetaRFIDRow[]>({
    queryKey: RFID_LABELS_KEY,
    queryFn: getEtiquetasRFID,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    errorUpdatedAt: query.errorUpdatedAt,
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
