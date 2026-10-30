import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { MOVEMENT_LEDGER_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { isDrfActionRejection, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getMovementLedger } from "../services/actions";
import {
  isResolvedMovementLedger,
  type MovementLedgerParams,
  type MovementLedgerResponse,
} from "../interfaces/movement-ledger.interface";

/**
 * Auxiliar de movimientos (kardex de una variante). `params` es `null`
 * mientras no hay nada que buscar (sin texto ni variante, o con una sola de las
 * dos fechas): `enabled: false` evita la consulta.
 *
 * - Un 400 (parámetros) o un 404 (variante fuera de la empresa) no se
 *   reintentan: repetir la misma petición da la misma respuesta.
 * - Mientras se cambia almacén o rango de la MISMA variante se sigue viendo su
 *   kardex anterior (`isPlaceholderData`); una búsqueda nueva no hereda nada,
 *   porque podría responder con opciones en vez de un kardex.
 */
export const useMovementLedger = (params: MovementLedgerParams | null) => {
  const { data, isLoading, isFetching, isPlaceholderData, isInitialError, error, refetch } =
    useGuardedQuery<MovementLedgerResponse>(
      {
        queryKey: [...MOVEMENT_LEDGER_QUERY_KEY, params],
        queryFn: () => getMovementLedger(params as MovementLedgerParams),
        enabled: params !== null,
        retry: (failureCount, failure) =>
          !isDrfActionRejection(failure) && !isNotFoundError(failure) && failureCount < 1,
        placeholderData: (previous) =>
          previous &&
          isResolvedMovementLedger(previous) &&
          previous.variante.producto_variante_id === params?.producto_variante
            ? previous
            : undefined,
      },
      { toastId: "movement-ledger-refetch-error" },
    );

  return {
    ledger: data,
    isLoading,
    isFetching,
    isPlaceholderData,
    isInitialError,
    error,
    refetch,
  };
};
