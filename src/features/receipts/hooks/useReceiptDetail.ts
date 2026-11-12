import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getReceiptDetail } from "../services/actions";
import type { ReceiptDetail } from "../interfaces/receipt.interface";

/** Llave del detalle de una recepción (la observan los diálogos de detalle). */
export const receiptDetailQueryKey = (id: number | null) => ["receipt-detail", id] as const;

/**
 * Hook compartido para el detalle de una recepción
 * (`GET /compras/recepciones/{id}/`). Es intencionalmente genérico (no filtra
 * por `tipo_origen`): lo usan los diálogos de Compras y WMS y la inspección de
 * calidad. `enabled: id !== null && id > 0` mantiene la consulta deshabilitada
 * mientras no haya una recepción seleccionada (id = null).
 *
 * Pasa por `useGuardedQuery` (EC-856): un refetch fallido CONSERVA el detalle ya
 * cargado y avisa por toast, en vez de cambiar el diálogo a su estado de error
 * (y quitarle el botón "Descargar PDF") con los datos todavía a mano. Solo una
 * carga inicial fallida es error (`isInitialError`), como antes.
 */
export const useReceiptDetail = (id: number | null) => {
  const { data, isLoading, isInitialError, error, refetch } = useGuardedQuery<ReceiptDetail>(
    {
      queryKey: receiptDetailQueryKey(id),
      queryFn: () => getReceiptDetail(id as number),
      enabled: id !== null && id > 0,
    },
    {
      toastId: "receipt-detail-refetch-error",
      errorMessage: "No se pudo actualizar la recepción. Mostrando datos anteriores.",
    },
  );

  return { data, isLoading, isInitialError, error, refetch };
};
