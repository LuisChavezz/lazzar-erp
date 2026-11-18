"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getSurtidoPedidoDetalle } from "../services/actions";
import { SURTIDO_PEDIDOS_KEY } from "../constants/surtidoPedidosTable";

/**
 * Detalle por talla de un pedido (`GET /wms/surtido-pedidos/{id}/`). Cuelga del
 * prefijo `["surtido-pedidos"]`, así que "Actualizar datos" de la lista
 * (que invalida el prefijo) también lo refresca.
 *
 * El 404 (pedido cancelado, fuera de la empresa o sucursal del usuario) es un
 * error DEFINITIVO: no se reintenta ni avisa por toast, y se muestra aparte.
 */
export const useSurtidoPedidoDetalle = (pedidoId: number | null) =>
  useGuardedQuery(
    {
      queryKey: [...SURTIDO_PEDIDOS_KEY, "detail", pedidoId],
      queryFn: () => getSurtidoPedidoDetalle(pedidoId!),
      enabled: pedidoId !== null,
    },
    {
      toastId: "surtido-pedido-detalle-refetch-error",
      errorMessage: "No se pudo actualizar el avance por talla. Se muestran los datos anteriores.",
      isDefinitiveError: isNotFoundError,
    },
  );
