import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWarehouse } from "../services/actions";
import { WarehouseCreate } from "../interfaces/warehouse.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstNestedFieldMessage } from "@/src/utils/firstDrfMessage";

type SetWarehouseError = (
  field: keyof WarehouseCreate,
  error: { type?: string; message?: string }
) => void;

export const useCreateWarehouse = (setError?: SetWarehouseError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Almacén registrado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof WarehouseCreate;
            const errorMessage = firstNestedFieldMessage(validationErrors[key]);

            if (errorMessage) {
              setError(fieldKey, {
                type: "server",
                message: errorMessage,
              });
            }
          });
        }
      }
      toast.error("Error al registrar el almacén");
    },
  });
};
