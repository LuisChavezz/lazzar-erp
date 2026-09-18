import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { deleteContract } from "../services/actions";
import { Contract } from "../interfaces/contract.interface";

export const useDeleteContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteContract,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["contracts"] });
      const previousContracts = queryClient.getQueryData<Contract[]>(["contracts"]);

      // El DELETE es una baja lógica: el registro NO sale del listado, pasa a
      // `activo: false`. Por eso el optimista marca la fila como inactiva en
      // lugar de filtrarla — filtrarla la haría desaparecer para volver a
      // aparecer en cuanto el refetch la devolviera.
      if (previousContracts) {
        queryClient.setQueryData<Contract[]>(["contracts"], (old) =>
          old
            ? old.map((contract) => (contract.id === id ? { ...contract, activo: false } : contract))
            : []
        );
      }

      return { previousContracts };
    },
    onError: (err, id, context) => {
      if (context?.previousContracts) {
        queryClient.setQueryData(["contracts"], context.previousContracts);
      }
      console.error(err);
      toast.error(extractErrorMessage(err, "Error al desactivar el contrato"));
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["contracts"] }),
    onSuccess: () => {
      toast.success("Contrato desactivado correctamente");
    },
  });
};
