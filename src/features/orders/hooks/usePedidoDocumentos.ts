import { useEffect, useRef } from "react";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundOrForbiddenError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getPedidoDocumentos } from "../services/actions";

/** Raíz de las llaves de documentos: invalidarla alcanza a TODOS los pedidos en caché. */
export const PEDIDO_DOCUMENTOS_QUERY_ROOT = "pedido-documentos";

/**
 * Llave con namespace propio, como la de la trazabilidad: la invalidan por id
 * las mutaciones que cambian documentos del pedido (alta y cancelación de su
 * factura) y por raíz las de otros módulos (`invalidatePedidoProgress`).
 */
export const pedidoDocumentosQueryKey = (id: number) =>
  [PEDIDO_DOCUMENTOS_QUERY_ROOT, id] as const;

/**
 * Documentos del pedido (`GET /ventas/pedidos/{id}/documentos/`), para la hoja
 * "Documentos" del detalle 360°.
 *
 * `enabled`: la página lo monta desde su primer render y lo enciende SOLO con
 * la hoja "Documentos" activa; nunca sale junto con la trazabilidad, que vive
 * en "Avances". TanStack no aplica `refetchOnMount` al HABILITAR un observador
 * ya montado, así que al pasar de apagado a encendido se relee aquí (mismo
 * patrón que `usePedidoTrazabilidad`): cada vez que se abre la hoja se ven los
 * documentos que otros usuarios crearon mientras tanto. `cancelRefetch: false`
 * se une a una lectura en vuelo en vez de duplicarla.
 *
 * Un 404/403 (pedido inexistente, cancelado o de otra empresa) es definitivo:
 * no se reintenta ni avisa por toast, porque la página ya lo explica ("Pedido
 * no encontrado"). Un refetch fallido con datos los conserva y avisa por toast.
 */
export const usePedidoDocumentos = (
  id: number,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const isEnabled = enabled && id > 0;
  const { data, isLoading, isFetching, isInitialError, isDefinitiveError, error, refetch } =
    useGuardedQuery(
      {
        queryKey: pedidoDocumentosQueryKey(id),
        // Arrow a propósito: con `getPedidoDocumentos` pelado React Query le
        // inyectaría su `QueryFunctionContext` como `id`.
        queryFn: () => getPedidoDocumentos(id),
        enabled: isEnabled,
        refetchOnMount: "always",
        retry: retryUnlessClientError,
      },
      {
        toastId: "pedido-documentos-refetch-error",
        errorMessage: "No se pudieron actualizar los documentos. Mostrando datos anteriores.",
        isDefinitiveError: isNotFoundOrForbiddenError,
      },
    );

  const wasEnabledRef = useRef(isEnabled);
  useEffect(() => {
    const wasEnabled = wasEnabledRef.current;
    wasEnabledRef.current = isEnabled;
    if (isEnabled && !wasEnabled) void refetch({ cancelRefetch: false });
  }, [isEnabled, refetch]);

  return { data, isLoading, isFetching, isInitialError, isDefinitiveError, error, refetch };
};

/** Lo que la página entrega a la hoja "Documentos" (dueña única de la consulta). */
export type PedidoDocumentosQuery = ReturnType<typeof usePedidoDocumentos>;
