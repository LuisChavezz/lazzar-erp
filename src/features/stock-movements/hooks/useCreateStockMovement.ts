import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { createStockMovement, type CreateStockMovementPayload } from "../services/actions";

export type StockMovementFieldMapping = keyof CreateStockMovementPayload | "observaciones";

type SetStockMovementError = (
  field: StockMovementFieldMapping,
  error: { type?: string; message?: string },
) => void;

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
            // Establecer error por campo si hay callback.
            if (setError) {
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
