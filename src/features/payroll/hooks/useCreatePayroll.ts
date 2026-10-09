import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createPayroll } from "../services/actions";
import type { PayrollCreate } from "../interfaces/payroll.interface";
import { PAYROLL_KEY_ROOT } from "./usePayrolls";
import { notifyPayrollWriteError, type PayrollWriteErrorHandlers } from "./payrollWriteErrors";

/**
 * Alta individual. `empresa` y `sucursal` NO salen del workspace: los deriva el
 * formulario del empleado elegido (ver `usePayrollForm`). Se devuelve la
 * promesa de la invalidación para que `mutateAsync` no resuelva hasta que el
 * listado se refresque.
 */
export const useCreatePayroll = (handlers: PayrollWriteErrorHandlers = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payroll: PayrollCreate) => createPayroll(payroll),
    onSuccess: () => {
      toast.success("Nómina creada correctamente");
    },
    onError: (error) => notifyPayrollWriteError(error, "Error al crear la nómina", handlers),
    onSettled: () => queryClient.invalidateQueries({ queryKey: PAYROLL_KEY_ROOT }),
  });
};
