import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSupplier } from "../services/actions";
import toast from "react-hot-toast";
import { Supplier } from "../interfaces/supplier.interface";

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
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
      toast.error("Error al eliminar el proveedor");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onSuccess: () => {
      toast.success("Proveedor eliminado correctamente");
    },
  });
};
