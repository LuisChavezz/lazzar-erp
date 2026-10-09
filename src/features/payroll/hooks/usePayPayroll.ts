import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { payPayroll } from "../services/actions";
import type { PayrollPayVariables } from "../interfaces/payroll.interface";
import { PAYROLL_KEY_ROOT } from "./usePayrolls";
import { payrollActionErrorMessage } from "./payrollErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingPayrollIds`). */
export const payPayrollMutationKey = ["pay-payroll"] as const;

interface UsePayPayrollOptions {
  /** Un error del backend sobre `fecha_pago` se entrega aquí EN VEZ de un toast. */
  onFechaPagoError?: (message: string) => void;
}

/**
 * Marcar como pagada: `PATCH {estado: "pagada", fecha_pago}`. Sin optimista,
 * como `useRejectVacation`: se espera la respuesta y se invalida el listado.
 */
export const usePayPayroll = ({ onFechaPagoError }: UsePayPayrollOptions = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: payPayrollMutationKey,
    mutationFn: ({ id, fecha_pago }: PayrollPayVariables) => payPayroll(id, fecha_pago),
    onSuccess: () => {
      toast.success("Nómina marcada como pagada");
    },
    onError: (error) => {
      console.error(error);
      const fechaMessage = drfFieldMessage(error, "fecha_pago");
      if (fechaMessage && onFechaPagoError) {
        onFechaPagoError(fechaMessage);
        return;
      }
      toast.error(
        payrollActionErrorMessage(
          error,
          "No se pudo marcar la nómina como pagada. Intenta de nuevo."
        )
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PAYROLL_KEY_ROOT }),
  });
};
