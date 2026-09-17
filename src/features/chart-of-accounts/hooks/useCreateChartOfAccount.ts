import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createChartOfAccount } from "../services/actions";
import { CHART_OF_ACCOUNTS_KEY_ROOT } from "./useChartOfAccounts";
import {
  setChartOfAccountFieldErrors,
  type SetChartOfAccountError,
} from "./setChartOfAccountFieldErrors";

/**
 * Alta de una cuenta contable.
 *
 * `setError` recibe los errores de campo del 400 para que el formulario los
 * pinte bajo su input — sobre todo el de `codigo` duplicado (ver
 * `setChartOfAccountFieldErrors`). El toast queda como aviso general.
 *
 * Se invalida por la RAÍZ de la llave: alcanza a este catálogo y al selector de
 * cuentas de la póliza, que cuelga del mismo prefijo.
 */
export const useCreateChartOfAccount = (setError?: SetChartOfAccountError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createChartOfAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHART_OF_ACCOUNTS_KEY_ROOT });
      toast.success("Cuenta contable registrada correctamente");
    },
    onError: (error) => {
      setChartOfAccountFieldErrors(error, setError);
      toast.error("Error al registrar la cuenta contable");
    },
  });
};
