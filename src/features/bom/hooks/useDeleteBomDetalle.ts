import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteBomDetalle } from "../services/actions";
import type { Bom } from "../interfaces/bom.interface";

export const useDeleteBomDetalle = (queryKey: unknown[]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteBomDetalle(id),

    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<Bom[]>(queryKey);

      if (previousData) {
        queryClient.setQueryData<Bom[]>(queryKey, (old) =>
          old?.map((bom) => ({
            ...bom,
            materia_prima_detalle: bom.materia_prima_detalle.filter(
              (item) => item.bom_detalle_id !== id
            ),
          })) ?? old
        );
      }

      return { previousData };
    },

    onError: (err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      console.error(err);
      toast.error("Error al eliminar el material");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      // `tiene_bom` del selector de variantes (alta de OP) depende de las
      // listas de materiales: sin esto, la variante seguiría como "Sin BOM"
      // hasta que venciera la caché.
      queryClient.invalidateQueries({ queryKey: ["product-variants"] });
    },

    onSuccess: () => {
      toast.success("Material eliminado correctamente");
    },
  });
};
