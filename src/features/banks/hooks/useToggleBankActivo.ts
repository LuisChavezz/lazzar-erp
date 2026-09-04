import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { setBankActivo } from "../services/actions";
import { Banco } from "../interfaces/bank.interface";

interface ToggleBankActivoPayload {
  id: number;
  activo: boolean;
}

/**
 * Activa o desactiva un banco (PATCH de `activo`).
 *
 * Ocupa el lugar que en otros catálogos tiene el hook de borrado: aquí el
 * `DELETE` del backend es FÍSICO, así que la pantalla no lo expone y `activo`
 * es el único control de ciclo de vida (ver `setBankActivo`).
 *
 * Actualización optimista igual que en el resto de catálogos: se cancela lo que
 * esté en vuelo, se guarda una instantánea, se escribe el valor nuevo, se
 * revierte en `onError` y se invalida en `onSettled`. El registro NO sale del
 * listado al desactivarse: sigue visible con estatus Inactivo, por eso el
 * optimista MARCA la fila en vez de filtrarla.
 */
export const useToggleBankActivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activo }: ToggleBankActivoPayload) => setBankActivo(id, activo),
    onMutate: async ({ id, activo }) => {
      await queryClient.cancelQueries({ queryKey: ["banks"] });
      const previousBanks = queryClient.getQueryData<Banco[]>(["banks"]);

      if (previousBanks) {
        queryClient.setQueryData<Banco[]>(["banks"], (old) =>
          old ? old.map((banco) => (banco.id === id ? { ...banco, activo } : banco)) : []
        );
      }

      return { previousBanks };
    },
    onError: (err, variables, context) => {
      if (context?.previousBanks) {
        queryClient.setQueryData(["banks"], context.previousBanks);
      }
      console.error(err);
      toast.error(
        variables.activo ? "Error al activar el banco" : "Error al desactivar el banco"
      );
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["banks"] }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.activo ? "Banco activado correctamente" : "Banco desactivado correctamente"
      );
    },
  });
};
