import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getEtiquetaRFID } from "../services/actions";
import { rfidLabelDetailQueryKey } from "../constants/rfidLabelQueryKeys";
import type { EtiquetaRFID } from "../interfaces/rfid-label.interface";

/**
 * Detalle de UNA impresión (`GET /wms/etiquetas-rfid/{id}/`): lo único que trae
 * sus EPC (`etiquetas`) y su `zpl_enviado`, que el listado ligero ya no manda
 * (EC-989). `0` = sin selección.
 *
 * El 404 (otra empresa/sucursal o inexistente) es DEFINITIVO: no se reintenta
 * ni conserva lo cargado. La llave cuelga de `["etiquetas-rfid"]`.
 */
export const useRfidLabelDetail = (id: number) => {
  const { data, isLoading, isInitialError, isDefinitiveError, error } = useGuardedQuery<EtiquetaRFID>(
    {
      queryKey: rfidLabelDetailQueryKey(id),
      queryFn: () => getEtiquetaRFID(id),
      enabled: id > 0,
    },
    {
      toastId: "etiqueta-rfid-detail-refetch-error",
      errorMessage: "No se pudo actualizar la impresión. Mostrando datos anteriores.",
      isDefinitiveError: isNotFoundError,
    },
  );
  return { data, isLoading, isInitialError, isNotFound: isDefinitiveError, error };
};
