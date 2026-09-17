import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { setChartOfAccountActivo } from "../services/actions";
import type { CuentaContable } from "../interfaces/chart-of-account.interface";
import {
  CHART_OF_ACCOUNTS_KEY_ROOT,
  CHART_OF_ACCOUNTS_LIST_KEY,
} from "./useChartOfAccounts";

interface ToggleChartOfAccountActivoPayload {
  id: number;
  activo: boolean;
}

/**
 * Activa o desactiva una cuenta contable (PATCH de `activo`).
 *
 * Ocupa el lugar que en otros catálogos tendría el hook de borrado: aquí el
 * `DELETE` del backend es FÍSICO y `cuenta_padre` es `PROTECT`, así que la
 * pantalla no lo expone y `activo` es el único control de ciclo de vida (ver
 * `setChartOfAccountActivo`).
 *
 * Actualización optimista igual que en bancos: se cancela lo que esté en vuelo,
 * se guarda una instantánea, se escribe el valor nuevo, se revierte en `onError`
 * y se invalida en `onSettled`. La cuenta NO sale del listado al desactivarse:
 * sigue visible con estatus Inactivo, por eso el optimista MARCA la fila en vez
 * de filtrarla.
 *
 * El optimista escribe sobre la llave EXACTA del catálogo; la invalidación va
 * por la RAÍZ, que además refresca el selector de cuentas de la póliza —una
 * cuenta recién desactivada deja de ofrecerse ahí—.
 */
export const useToggleChartOfAccountActivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activo }: ToggleChartOfAccountActivoPayload) =>
      setChartOfAccountActivo(id, activo),
    onMutate: async ({ id, activo }) => {
      await queryClient.cancelQueries({ queryKey: CHART_OF_ACCOUNTS_LIST_KEY });
      const previousCuentas = queryClient.getQueryData<CuentaContable[]>(
        CHART_OF_ACCOUNTS_LIST_KEY,
      );

      if (previousCuentas) {
        queryClient.setQueryData<CuentaContable[]>(
          CHART_OF_ACCOUNTS_LIST_KEY,
          (old) =>
            old
              ? old.map((cuenta) =>
                  cuenta.id === id ? { ...cuenta, activo } : cuenta,
                )
              : [],
        );
      }

      return { previousCuentas };
    },
    onError: (error, variables, context) => {
      if (context?.previousCuentas) {
        queryClient.setQueryData(
          CHART_OF_ACCOUNTS_LIST_KEY,
          context.previousCuentas,
        );
      }
      console.error(error);
      toast.error(
        variables.activo
          ? "Error al activar la cuenta contable"
          : "Error al desactivar la cuenta contable",
      );
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: CHART_OF_ACCOUNTS_KEY_ROOT }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.activo
          ? "Cuenta contable activada correctamente"
          : "Cuenta contable desactivada correctamente",
      );
    },
  });
};
