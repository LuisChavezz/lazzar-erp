import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSupplier } from "../services/actions";
import { SupplierCreate } from "../interfaces/supplier.interface";
import { SupplierFormValues } from "../schemas/supplier.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

interface UpdateSupplierPayload extends SupplierCreate {
  id: number;
}

type SetSupplierError = (
  field: keyof SupplierFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateSupplier = (setError?: SetSupplierError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateSupplierPayload) =>
      updateSupplier(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor actualizado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof SupplierFormValues;
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
      toast.error("No se pudo actualizar el proveedor");
    },
  });
};
