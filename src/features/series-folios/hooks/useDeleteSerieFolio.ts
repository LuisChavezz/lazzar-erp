import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSerieFolio } from "../services/actions";
import toast from "react-hot-toast";
import { SerieFolio } from "../interfaces/serie-folio.interface";

export const useDeleteSerieFolio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSerieFolio,
    onMutate: async (serieFolio) => {
      await queryClient.cancelQueries({ queryKey: ["series-folios"] });
      const previousSeriesFolios = queryClient.getQueryData<SerieFolio[]>(["series-folios"]);

      if (previousSeriesFolios) {
        queryClient.setQueryData<SerieFolio[]>(["series-folios"], (old) =>
          old ? old.filter((item) => item.id_serie_folio !== serieFolio.id_serie_folio) : []
        );
      }

      return { previousSeriesFolios };
    },
    onError: (err, serieFolio, context) => {
      if (context?.previousSeriesFolios) {
        queryClient.setQueryData(["series-folios"], context.previousSeriesFolios);
      }
      console.error(err);
      toast.error("Error al eliminar la serie y folio");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["series-folios"] });
    },
    onSuccess: () => {
      toast.success("Serie y folio eliminados correctamente");
    },
  });
};
