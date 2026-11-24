import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getPackingDetail } from "../services/actions";
import type { Packing } from "../interfaces/packing.interface";

/**
 * Detalle de un packing (`GET /wms/packings/{id}/`). Llave
 * `["packing-detail", id]`.
 *
 * Mismo patrón que `usePickingDetail`: id nullable y `enabled` que mantiene la
 * consulta APAGADA sin un id válido, y `useGuardedQuery`: un refetch fallido
 * CONSERVA el embarque (solo toast), así que el detalle abierto —y sus acciones,
 * p. ej. tras cancelarlo (EC-945)— no se cambia por un error. El 404 (no existe
 * o fuera de alcance) es definitivo: no se reintenta ni conserva datos.
 *
 * No lo usa la vista de listado —que arma el diálogo con la fila en caché—, sino
 * consumidores que solo tienen el id, como la hoja "Documentos" del detalle de
 * pedido y la bitácora.
 */
export const usePackingDetail = (id: number | null) => {
  const { data, isLoading, isInitialError, isDefinitiveError, error } = useGuardedQuery<Packing>(
    {
      queryKey: ["packing-detail", id],
      queryFn: () => getPackingDetail(id as number),
      enabled: id !== null && id > 0,
    },
    {
      toastId: "packing-detail-refetch-error",
      errorMessage: "No se pudo actualizar el embarque. Se muestran los datos anteriores.",
      isDefinitiveError: isNotFoundError,
    },
  );

  return { packing: data, isLoading, isInitialError, isNotFound: isDefinitiveError, error };
};
