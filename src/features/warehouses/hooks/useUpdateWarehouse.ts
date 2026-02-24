import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateWarehouse } from "../services/actions";
import { WarehouseCreate } from "../interfaces/warehouse.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";

interface UpdateWarehousePayload extends WarehouseCreate {
  id_almacen: number;
}

export const useUpdateWarehouse = (setError?: UseFormSetError<WarehouseCreate>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id_almacen, ...values }: UpdateWarehousePayload) =>
      updateWarehouse(id_almacen, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Almacén actualizado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof WarehouseCreate;
            const errorMessages = validationErrors[key];

            if (Array.isArray(errorMessages) && errorMessages.length > 0) {
              setError(fieldKey, {
                type: "server",
                message: errorMessages[0],
              });
            }
          });
        }
      }
      toast.error("Error al actualizar el almacén");
    },
  });
};
