"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getDigitalStockDetail } from "../services/actions";
import { DIGITAL_STOCK_KEY } from "../constants/digitalStockTable";

/**
 * Llave del detalle de un SKU: incluye la sucursal, porque con ella las cifras
 * cambian (son las de la fila del listado filtrado por esa sucursal).
 */
export const digitalStockDetailKey = (varianteId: number | null, sucursal: number | undefined) =>
  [...DIGITAL_STOCK_KEY, "detail", varianteId, sucursal ?? null] as const;

/**
 * Detalle de un SKU (`GET /ventas/stock-digital/{variante_id}/`), con la misma
 * `sucursal` con que se filtró el listado. Cuelga del prefijo `["stock-digital"]`,
 * así que "Actualizar datos" de la lista e `invalidateStockQueries` también lo
 * refrescan.
 *
 * El 404 ("No existe ese SKU en tu empresa.") es un error DEFINITIVO: no se
 * reintenta ni avisa por toast, y se muestra aparte.
 */
export const useDigitalStockDetail = (varianteId: number | null, sucursal: number | undefined) =>
  useGuardedQuery(
    {
      queryKey: digitalStockDetailKey(varianteId, sucursal),
      queryFn: () => getDigitalStockDetail(varianteId!, sucursal),
      enabled: varianteId !== null,
    },
    {
      toastId: "digital-stock-detail-refetch-error",
      errorMessage: "No se pudo actualizar el detalle del SKU. Se muestran los datos anteriores.",
      isDefinitiveError: isNotFoundError,
    },
  );
