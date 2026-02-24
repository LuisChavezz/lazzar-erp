import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteWarehouse } from "../services/actions";
import toast from "react-hot-toast";
import { Warehouse } from "../interfaces/warehouse.interface";

export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWarehouse,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["warehouses"] });
      const previousWarehouses = queryClient.getQueryData<Warehouse[]>(["warehouses"]);

      if (previousWarehouses) {
        queryClient.setQueryData<Warehouse[]>(["warehouses"], (old) =>
          old ? old.filter((warehouse) => warehouse.id_almacen !== id) : []
        );
      }

      return { previousWarehouses };
    },
    onError: (err, id, context) => {
      if (context?.previousWarehouses) {
        queryClient.setQueryData(["warehouses"], context.previousWarehouses);
      }
      console.error(err);
      toast.error("Error al eliminar el almacén");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onSuccess: () => {
      toast.success("Almacén eliminado correctamente");
    },
  });
};
