"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getDigitalStockDetail } from "../services/actions";
import { DIGITAL_STOCK_KEY } from "../constants/digitalStockTable";

/**
 * Detalle de un SKU (`GET /ventas/stock-digital/{variante_id}/`). Cuelga del
 * prefijo `["stock-digital"]`, así que "Actualizar datos" de la lista (que
 * invalida el prefijo) también lo refresca.
 *
 * El 404 ("No existe ese SKU en tu empresa.") es un error DEFINITIVO: no se
 * reintenta ni avisa por toast, y se muestra aparte.
 */
export const useDigitalStockDetail = (varianteId: number | null) =>
  useGuardedQuery(
    {
      queryKey: [...DIGITAL_STOCK_KEY, "detail", varianteId],
      queryFn: () => getDigitalStockDetail(varianteId!),
      enabled: varianteId !== null,
    },
    {
      toastId: "digital-stock-detail-refetch-error",
      errorMessage: "No se pudo actualizar el detalle del SKU. Se muestran los datos anteriores.",
      isDefinitiveError: isNotFoundError,
    },
  );
