import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateChartOfAccount } from "../services/actions";
import type { CuentaContableCreate } from "../interfaces/chart-of-account.interface";
import { CHART_OF_ACCOUNTS_KEY_ROOT } from "./useChartOfAccounts";
import {
  setChartOfAccountFieldErrors,
  type SetChartOfAccountError,
} from "./setChartOfAccountFieldErrors";

interface UpdateChartOfAccountPayload extends CuentaContableCreate {
  id: number;
}

/**
 * Edición de la cabecera de una cuenta contable (PATCH).
 *
 * El payload no lleva `cuenta_padre` ni `activo`, así que ambos CONSERVAN su
 * valor (ver `updateChartOfAccount`). El 400 de `codigo` duplicado también
 * aplica al editar: se reparte igual que en el alta.
 */
export const useUpdateChartOfAccount = (setError?: SetChartOfAccountError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateChartOfAccountPayload) =>
      updateChartOfAccount(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHART_OF_ACCOUNTS_KEY_ROOT });
      toast.success("Cuenta contable actualizada correctamente");
    },
    onError: (error) => {
      setChartOfAccountFieldErrors(error, setError);
      toast.error("Error al actualizar la cuenta contable");
    },
  });
};
