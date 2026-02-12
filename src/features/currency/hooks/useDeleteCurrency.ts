import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCurrency } from "../services/actions";
import toast from "react-hot-toast";
import { Currency } from "../interfaces/currency.interface";

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCurrency,
    onMutate: async (currencyIso) => {
      // Cancelar consultas salientes para evitar sobreescrituras
      await queryClient.cancelQueries({ queryKey: ["currencies"] });

      // Guardar el estado anterior
      const previousCurrencies = queryClient.getQueryData<Currency[]>(["currencies"]);

      // Actualizar optimísticamente
      if (previousCurrencies) {
        queryClient.setQueryData<Currency[]>(["currencies"], (old) =>
          old ? old.filter((currency) => currency.codigo_iso !== currencyIso) : []
        );
      }

      return { previousCurrencies };
    },
    onError: (err, currencyIso, context) => {
      // Revertir si hay error
      if (context?.previousCurrencies) {
        queryClient.setQueryData(["currencies"], context.previousCurrencies);
      }
      console.error(err);
      toast.error("Error al eliminar la moneda");
    },
    onSettled: () => {
      // Invalidar siempre para asegurar consistencia
      queryClient.invalidateQueries({ queryKey: ["currencies"] });
    },
    onSuccess: () => {
      toast.success("Moneda eliminada correctamente");
    },
  });
};
