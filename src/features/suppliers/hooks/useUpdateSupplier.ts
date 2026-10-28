import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierKpisQueryKey } from "./useSupplierKpis";
import { updateSupplier } from "../services/actions";
import { SupplierUpdate } from "../interfaces/supplier.interface";
import { handleSupplierWriteError, type SetSupplierError } from "./supplierErrorMessages";
import toast from "react-hot-toast";

interface UpdateSupplierPayload extends SupplierUpdate {
  id: number;
}

export const useUpdateSupplier = (setError?: SetSupplierError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateSupplierPayload) =>
      updateSupplier(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      // El drill-down de indicadores muestra nombres y enlaza solo proveedores activos.
      queryClient.invalidateQueries({ queryKey: supplierKpisQueryKey });
      toast.success("Proveedor actualizado correctamente");
    },
    onError: (error) => {
      toast.error(handleSupplierWriteError(error, "No se pudo actualizar el proveedor", setError));
    },
  });
};
