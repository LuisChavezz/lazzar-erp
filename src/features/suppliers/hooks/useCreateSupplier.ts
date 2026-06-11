"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupplier } from "../services/actions";
import { Supplier, SupplierCreate } from "../interfaces/supplier.interface";
import { SupplierFormValues } from "../schemas/supplier.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

type SetSupplierError = (
  field: keyof SupplierFormValues,
  error: { type?: string; message?: string }
) => void;

interface UseCreateSupplierOptions {
  setError?: SetSupplierError;
}

export const useCreateSupplier = ({ setError }: UseCreateSupplierOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation<Supplier, unknown, SupplierCreate>({
    mutationFn: (payload: SupplierCreate) => createSupplier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Proveedor registrado correctamente");
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
      toast.error("No se pudo registrar el proveedor");
    },
  });
};