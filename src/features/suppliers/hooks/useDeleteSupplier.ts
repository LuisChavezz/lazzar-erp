import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierKpisQueryKey } from "./useSupplierKpis";
import { deleteSupplier } from "../services/actions";
import toast from "react-hot-toast";
import { Supplier } from "../interfaces/supplier.interface";

/**
 * Identifica la baja en curso: el menú de cada fila la lee con `useIsMutating`
 * para deshabilitar "Desactivar" en TODAS mientras haya una en vuelo (dos bajas
 * simultáneas se pisarían los snapshots del rollback optimista).
 */
export const DELETE_SUPPLIER_MUTATION_KEY = ["delete-supplier"] as const;

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: DELETE_SUPPLIER_MUTATION_KEY,
    mutationFn: deleteSupplier,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["suppliers"] });
      const previousSuppliers = queryClient.getQueryData<Supplier[]>(["suppliers"]);

      if (previousSuppliers) {
        queryClient.setQueryData<Supplier[]>(["suppliers"], (old) =>
          old ? old.filter((supplier) => supplier.id !== id) : []
        );
      }

      return { previousSuppliers };
    },
    onError: (err, id, context) => {
      if (context?.previousSuppliers) {
        queryClient.setQueryData(["suppliers"], context.previousSuppliers);
      }
      console.error(err);
      toast.error("Error al desactivar el proveedor");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onSuccess: (_data, id) => {
      // Sin esto, volver al detalle mostraría la ficha cacheada del proveedor
      // ya desactivado. Solo la llave EXACTA: el listado `["suppliers"]` sigue.
      queryClient.removeQueries({ queryKey: ["suppliers", id], exact: true });
      // El drill-down de indicadores muestra nombres y enlaza solo proveedores activos.
      queryClient.invalidateQueries({ queryKey: supplierKpisQueryKey });
      toast.success("Proveedor desactivado correctamente");
    },
  });
};
