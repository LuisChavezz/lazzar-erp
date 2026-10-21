import { useQuery } from "@tanstack/react-query";
import { getCuentaPorCobrarDetail } from "../services/actions";
import type { CuentaPorCobrarDetail } from "../interfaces/accounts-receivable-detail.interface";

/**
 * useCuentaPorCobrarDetail
 *
 * Lee el detalle de UNA cuenta por cobrar (`GET /finanzas/cuentas-por-cobrar/{id}/`).
 *
 * `id: number` con `0` como valor centinela de "sin selección" (`enabled: id >
 * 0`) — mismo patrón que `useStockMovementDetail`/`StockMovementDetailDialog`
 * (`0` nunca es un id real: los ids de CxC, como los de movimiento, son
 * autoincrementales de Django y arrancan en 1). El diálogo se monta solo al
 * abrirse (ver `AccountsReceivableColumns`) y SIEMPRE con el `id` real de la
 * fila, así que renderizar la tabla no dispara ninguna petición de detalle:
 * `enabled` es la segunda barrera, no la única.
 *
 * La llave NO cuelga del prefijo `["accounts-receivable"]` del listado: ese
 * prefijo es exactamente el que invalida la mutación de "Registrar CxC"
 * (`useRegisterPendingInvoice`), y refrescar el detalle abierto no tiene nada
 * que ver con haber dado de alta OTRA cuenta. Namespace propio, mismo patrón que
 * `useReceiptDetail` (`["receipt-detail", id]`) y `useStockMovementDetail`.
 */
export const useCuentaPorCobrarDetail = (id: number) => {
  return useQuery<CuentaPorCobrarDetail>({
    queryKey: ["accounts-receivable-detail", id],
    queryFn: () => getCuentaPorCobrarDetail(id),
    enabled: id > 0,
  });
};
