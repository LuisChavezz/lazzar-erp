import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { setBankAccountActivo } from "../services/actions";
import { CuentaBancaria } from "../interfaces/bank-account.interface";

interface ToggleBankAccountActivoPayload {
  id: number;
  activo: boolean;
}

/**
 * Activa o desactiva una cuenta bancaria (PATCH de `activo`).
 *
 * Ocupa el lugar que en otros catálogos tiene el hook de borrado: aquí el
 * `DELETE` del backend es FÍSICO, así que la pantalla no lo expone y `activo` es
 * el único control de ciclo de vida (ver `setBankAccountActivo`).
 *
 * Actualización optimista igual que en `banks`: se cancela lo que esté en vuelo,
 * se guarda una instantánea, se escribe el valor nuevo, se revierte en `onError`
 * y se invalida en `onSettled`. El registro NO sale del listado al desactivarse:
 * sigue visible con estatus Inactivo, por eso el optimista MARCA la fila en vez
 * de filtrarla.
 */
export const useToggleBankAccountActivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activo }: ToggleBankAccountActivoPayload) =>
      setBankAccountActivo(id, activo),
    onMutate: async ({ id, activo }) => {
      await queryClient.cancelQueries({ queryKey: ["bank-accounts"] });
      const previousAccounts = queryClient.getQueryData<CuentaBancaria[]>([
        "bank-accounts",
      ]);

      if (previousAccounts) {
        queryClient.setQueryData<CuentaBancaria[]>(["bank-accounts"], (old) =>
          old ? old.map((cuenta) => (cuenta.id === id ? { ...cuenta, activo } : cuenta)) : []
        );
      }

      return { previousAccounts };
    },
    onError: (err, variables, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(["bank-accounts"], context.previousAccounts);
      }
      console.error(err);
      toast.error(
        variables.activo
          ? "Error al activar la cuenta bancaria"
          : "Error al desactivar la cuenta bancaria"
      );
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["bank-accounts"] }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.activo
          ? "Cuenta bancaria activada correctamente"
          : "Cuenta bancaria desactivada correctamente"
      );
    },
  });
};
