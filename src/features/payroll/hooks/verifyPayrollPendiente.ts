import type { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getPayroll } from "../services/actions";
import { ESTADO_PENDIENTE } from "../constants/payrollChoices";
import type { Payroll } from "../interfaces/payroll.interface";
import { PAYROLL_KEY_ROOT } from "./usePayrolls";
import {
  PAYROLL_CHECK_FAILED_MESSAGE,
  PAYROLL_GONE_MESSAGE,
  payrollEstadoChangedMessage,
} from "./payrollErrorMessages";

/**
 * Mismo contrato que `verifyProductivityEstado`, más la nómina fresca:
 * - `ok`: sigue `pendiente`; se puede escribir. `payroll` es la lectura fresca.
 * - `stale`: cambió de estado o ya no existe. No se escribe; ya se avisó y se
 *   invalidó el listado. El llamador cierra su diálogo.
 * - `error`: no se pudo comprobar (red, 5xx). No se escribe (falla CERRADO); ya
 *   se avisó. El llamador deja el diálogo abierto para reintentar.
 */
export type PayrollPendienteCheck =
  | { status: "ok"; payroll: Payroll }
  | { status: "stale" }
  | { status: "error" };

/**
 * Guarda previa a editar, marcar como pagada o cancelar. El backend no
 * protege `estado` en ninguna escritura, así que la única defensa contra una
 * caché vieja es leer la nómina FRESCA justo antes.
 *
 * Llama al servicio directamente, nunca a una consulta de TanStack: tiene que
 * ser una petición de red cada vez.
 */
export const verifyPayrollPendiente = async (
  queryClient: QueryClient,
  id: number
): Promise<PayrollPendienteCheck> => {
  let fresh: Payroll | null = null;
  try {
    fresh = await getPayroll(id);
  } catch (error) {
    if (!isNotFoundError(error)) {
      console.error(error);
      toast.error(PAYROLL_CHECK_FAILED_MESSAGE);
      return { status: "error" };
    }
  }

  if (fresh && fresh.estado === ESTADO_PENDIENTE) {
    return { status: "ok", payroll: fresh };
  }
  toast.error(fresh ? payrollEstadoChangedMessage(fresh.estado) : PAYROLL_GONE_MESSAGE);
  void queryClient.invalidateQueries({ queryKey: PAYROLL_KEY_ROOT });
  return { status: "stale" };
};
