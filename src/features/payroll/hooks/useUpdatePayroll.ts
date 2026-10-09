import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updatePayroll } from "../services/actions";
import type { PayrollUpdateVariables } from "../interfaces/payroll.interface";
import { PAYROLL_KEY_ROOT } from "./usePayrolls";
import { notifyPayrollWriteError, type PayrollWriteErrorHandlers } from "./payrollWriteErrors";

/**
 * Edición de una nómina `pendiente`. No optimista, a propósito: la escritura
 * depende de la guarda previa contra el servidor (`verifyPayrollPendiente`).
 */
export const useUpdatePayroll = (handlers: PayrollWriteErrorHandlers = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payroll }: PayrollUpdateVariables) => updatePayroll(id, payroll),
    onSuccess: () => {
      toast.success("Nómina actualizada correctamente");
    },
    onError: (error) => notifyPayrollWriteError(error, "Error al actualizar la nómina", handlers),
    onSettled: () => queryClient.invalidateQueries({ queryKey: PAYROLL_KEY_ROOT }),
  });
};
