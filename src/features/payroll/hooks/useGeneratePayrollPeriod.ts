import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generatePayrollPeriod } from "../services/actions";
import type { PayrollGenerateBody } from "../interfaces/payroll.interface";
import { PAYROLL_KEY_ROOT } from "./usePayrolls";

/**
 * Generar la quincena de una sucursal (`generar_periodo/`). El toast de éxito
 * y los errores los da `GeneratePayrollDialog`, que conoce la quincena y la
 * sucursal y pinta el 409 tal cual; aquí solo se refresca el listado.
 */
export const useGeneratePayrollPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PayrollGenerateBody) => generatePayrollPeriod(body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: PAYROLL_KEY_ROOT }),
  });
};
