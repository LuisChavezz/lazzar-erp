import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getEmbroideryOrderDetail } from "../services/actions";
import type { EmbroideryOrderDetail } from "../interfaces/embroidery.interface";

/**
 * Prefijo de los detalles de OB: invalidarlo refresca el detalle de TODAS las
 * órdenes (lo usa el alta, que cambia la cobertura de las hermanas).
 */
export const EMBROIDERY_ORDER_DETAIL_KEY = ["embroidery-order-detail"] as const;

/** Llave del detalle de UNA orden; la invalidan su PATCH y sus avances. */
export const embroideryOrderDetailQueryKey = (id: number | null) =>
  [...EMBROIDERY_ORDER_DETAIL_KEY, id] as const;

/**
 * Detalle de una orden de bordado (`GET /produccion/orden-bordado/{id}/`).
 * Llave `["embroidery-order-detail", id]`.
 *
 * Id nullable y `enabled` que mantiene la consulta APAGADA mientras no haya una
 * orden válida: `EmbroideryOrderDetailDialog` solo se monta con el diálogo
 * abierto, pero el `enabled` es lo que garantiza que un `id` nulo o inválido
 * —el que deja el diálogo al cerrarse— no dispare una petición.
 *
 * **El 404 es un error DEFINITIVO** (`isDefinitiveError` de `useGuardedQuery`):
 * no se reintenta, no avisa por toast y no conserva lo ya cargado. El backend lo
 * responde tanto para un id inexistente como para uno de otra empresa/sucursal
 * (su `get_queryset()` acotado por tenant no los distingue). Se expone como
 * `isNotFound`; `isInitialError` cubre cualquier otro fallo sin datos, y un
 * refetch fallido con datos los conserva y avisa por toast.
 */
export const useEmbroideryOrderDetail = (id: number | null) => {
  const { data, isInitialError, isDefinitiveError, error } =
    useGuardedQuery<EmbroideryOrderDetail>(
      {
        queryKey: embroideryOrderDetailQueryKey(id),
        queryFn: () => getEmbroideryOrderDetail(id as number),
        enabled: id !== null && id > 0,
        retry: retryUnlessClientError,
      },
      {
        toastId: "embroidery-order-detail-refetch-error",
        errorMessage: "No se pudo actualizar la orden de bordado. Mostrando datos anteriores.",
        isDefinitiveError: isNotFoundError,
      },
    );

  return { data, isNotFound: isDefinitiveError, isInitialError, error };
};
