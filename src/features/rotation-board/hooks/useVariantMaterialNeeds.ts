"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { AxiosError } from "axios";
import type { VariantMaterialNeeds } from "../interfaces/variant-materials.interface";
import { getVariantMaterialNeeds } from "../services/actions";
import { ROTATION_BOARD_KEY } from "./useRotationBoardTable";

/**
 * Desglose del BOM de un SKU para fabricar `cantidad` piezas
 * (`necesidades-materia-prima/?variante=&cantidad=[&sucursal=]`), con la misma
 * `sucursal` que el tablero para que cuadre con la fila (`null` = el alcance
 * por defecto del usuario).
 *
 * - Mientras llega una cantidad NUEVA se conserva el desglose anterior
 *   (`keepPreviousData`, misma variante): la tabla no parpadea al teclear.
 * - El 404 (la variante no es de la empresa o ya no existe) es DEFINITIVO.
 * - Un 400 con error en `cantidad` (fuera del tope del backend) se expone en
 *   `cantidadError` para pintarlo bajo el campo, con el texto del backend.
 */
export const useVariantMaterialNeeds = (
  variante: number | null,
  cantidad: number | null,
  sucursal: number | null,
) => {
  const enabled = variante !== null && cantidad !== null;
  const query = useGuardedQuery<VariantMaterialNeeds>(
    {
      queryKey: [...ROTATION_BOARD_KEY, "materials", variante, cantidad, sucursal],
      queryFn: () =>
        getVariantMaterialNeeds({
          variante: variante as number,
          cantidad: cantidad as number,
          sucursal,
        }),
      enabled,
      retry: retryUnlessClientError,
      placeholderData: keepPreviousData,
    },
    {
      toastId: "rotation-board-materials-refetch-error",
      errorMessage: "No se pudo actualizar el desglose de materiales.",
      isDefinitiveError: isNotFoundError,
    },
  );

  const isBadRequest = (query.error as AxiosError | null)?.response?.status === 400;
  return {
    needs: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    isInitialError: query.isInitialError,
    isNotFound: query.isDefinitiveError,
    error: query.error,
    cantidadError: isBadRequest ? drfFieldMessage(query.error, "cantidad") : undefined,
    refetch: query.refetch,
  };
};
