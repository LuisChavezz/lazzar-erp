"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getPedidoCotizacion } from "../services/actions";

/**
 * Llave de la cotización leída desde el pedido. Empieza por `["quote",
 * cotizacionId]` a propósito: TODAS las invalidaciones de una cotización por id
 * (editar el pedido en Mesa de Control, vincular SKU de muestra, editar,
 * enviar a revisión o rechazar la cotización...) la alcanzan sin tocarlas.
 * Guarda la cotización suelta (`QuoteDetailView`), no el `{ data, resource }`
 * de `getQuoteQueryOptions`.
 */
export const pedidoQuoteQueryKey = (cotizacionId: number, pedidoId: number) =>
  ["quote", cotizacionId, "pedido", pedidoId] as const;

/**
 * Cotización ligada a un pedido (`GET /ventas/pedidos/{id}/cotizacion/`), para
 * el pedido 360°. Sin respaldo entre recursos: este endpoint tiene el alcance
 * del pedido, así que sirve a todos los módulos que llegan a él.
 *
 * El 404 (pedido sin cotización, o no visible) es definitivo: no se reintenta,
 * no avisa por toast y sale en `isDefinitiveError`; la vista lo pinta como
 * estado vacío. Cualquier otro fallo inicial sale en `isInitialError`.
 */
export const usePedidoQuote = (cotizacionId: number | null, pedidoId: number) => {
  const isEnabled =
    cotizacionId !== null && cotizacionId > 0 && Number.isInteger(pedidoId) && pedidoId > 0;
  return useGuardedQuery(
    {
      queryKey: pedidoQuoteQueryKey(cotizacionId ?? 0, pedidoId),
      // Arrow a propósito: pelado, React Query le pasaría su contexto como id.
      queryFn: () => getPedidoCotizacion(pedidoId),
      enabled: isEnabled,
    },
    {
      toastId: "pedido-quote-refetch-error",
      isDefinitiveError: isNotFoundError,
    },
  );
};
