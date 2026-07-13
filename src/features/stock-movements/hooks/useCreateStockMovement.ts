import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { createStockMovement, type CreateStockMovementPayload } from "../services/actions";

// `pedido` no es un campo del formulario (se elige aparte, ver
// useStockMovementForm) — se excluye del mapeo genérico de errores por campo;
// su error se obtiene por separado con `parseStockMovementPedidoError`.
export type StockMovementFieldMapping =
  | Exclude<keyof CreateStockMovementPayload, "pedido">
  | "observaciones";

type SetStockMovementError = (
  field: StockMovementFieldMapping,
  error: { type?: string; message?: string },
) => void;

/**
 * Error de `pedido` normalizado a partir del contrato del backend:
 * `400` con `{ pedido: msg }` (pedido inexistente/inválido para el movimiento).
 * Sigue el mismo patrón que `parseCreateInvoiceError` (invoicing) — el pedido
 * no es un campo del formulario, así que su error no pasa por el mapeo
 * genérico de `setError`, sino que el hook de formulario lo lee directamente
 * a partir del error capturado en el `catch` de su envío.
 */
export const parseStockMovementPedidoError = (error: unknown): { message: string } | null => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data as { pedido?: string | string[] } | undefined;

    if (status === 400 && data?.pedido) {
      const message = Array.isArray(data.pedido) ? data.pedido[0] : data.pedido;
      if (message) return { message };
    }
  }
  return null;
};

export const useCreateStockMovement = (setError?: SetStockMovementError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStockMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
      toast.success("Movimiento de stock registrado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data && typeof data === "object") {
          // Recolectar mensajes de validación — el API puede devolver strings o arrays.
          const fieldMessages: string[] = [];

          Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
            // Establecer error por campo si hay callback — `pedido` se excluye:
            // no es un campo del formulario, se lee aparte con
            // `parseStockMovementPedidoError` en el `catch` del envío.
            if (setError && key !== "pedido") {
              const fieldKey = key as StockMovementFieldMapping;
              const message = Array.isArray(value) ? value[0] : value;
              if (typeof message === "string" && message.length > 0) {
                setError(fieldKey, { type: "server", message });
              }
            }

            // Recolectar mensaje para el toast.
            const msg = Array.isArray(value) ? value[0] : value;
            if (typeof msg === "string" && msg.length > 0) {
              fieldMessages.push(msg);
            }
          });

          // Mostrar toast con los mensajes de validación combinados.
          if (fieldMessages.length > 0) {
            toast.error(fieldMessages.join("\n"));
          } else {
            toast.error("Error de validación al registrar el movimiento de stock");
          }
        } else {
          toast.error(
            (error.response?.data as { detail?: string })?.detail ??
              "Error al registrar el movimiento de stock",
          );
        }
      } else {
        toast.error("Error al registrar el movimiento de stock");
      }
    },
  });
};
