import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { cancelPayroll } from "../services/actions";
import { PAYROLL_KEY_ROOT } from "./usePayrolls";
import { payrollActionErrorMessage } from "./payrollErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingPayrollIds`). */
export const cancelPayrollMutationKey = ["cancel-payroll"] as const;

/** Cancelar: `PATCH {estado: "cancelada"}`. Sin optimista. Es la salida en vez de eliminar. */
export const useCancelPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: cancelPayrollMutationKey,
    mutationFn: (id: number) => cancelPayroll(id),
    onSuccess: () => {
      toast.success("Nómina cancelada");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        payrollActionErrorMessage(error, "No se pudo cancelar la nómina. Intenta de nuevo.")
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PAYROLL_KEY_ROOT }),
  });
};
