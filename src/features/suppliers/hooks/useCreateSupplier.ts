"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSupplier } from "../services/actions";
import { Supplier, SupplierCreate } from "../interfaces/supplier.interface";
import { handleSupplierWriteError, type SetSupplierError } from "./supplierErrorMessages";
import toast from "react-hot-toast";

interface UseCreateSupplierOptions {
  setError?: SetSupplierError;
}

export const useCreateSupplier = ({ setError }: UseCreateSupplierOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation<Supplier, unknown, SupplierCreate>({
    mutationFn: (payload: SupplierCreate) => createSupplier(payload),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      // El código lo asigna el backend; la respuesta del POST es la única
      // forma de conocerlo.
      toast.success(`Proveedor registrado con código ${supplier.codigo}`);
    },
    onError: (error) => {
      toast.error(handleSupplierWriteError(error, "No se pudo registrar el proveedor", setError));
    },
  });
};
