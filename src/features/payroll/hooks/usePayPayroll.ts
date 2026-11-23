import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { replaceCachedRow } from "@/src/utils/cachedRows";
import { payPayroll } from "../services/actions";
import type { Payroll, PayrollPayVariables } from "../interfaces/payroll.interface";
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
    onSuccess: async (payroll) => {
      // La respuesta es el registro completo con la forma de la fila
      // (`NominaSerializer`, con `detalles`): se escribe en la quincena en
      // caché antes del refetch, que si falla dejaría "Marcar como pagada"
      // disponible (EC-927). `verifyPayrollPendiente` sigue siendo la guarda
      // antes de escribir.
      await replaceCachedRow<Payroll>(queryClient, PAYROLL_KEY_ROOT, payroll, ["estado"]);
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
