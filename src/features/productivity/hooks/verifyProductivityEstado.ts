import type { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getProductivityRecord } from "../services/actions";
import type { EstadoProductividad } from "../constants/productivityChoices";
import type { Productivity } from "../interfaces/productivity.interface";
import { PRODUCTIVITY_KEY } from "./useProductivity";
import {
  PRODUCTIVITY_CHECK_FAILED_MESSAGE,
  PRODUCTIVITY_GONE_MESSAGE,
  productivityEstadoChangedMessage,
} from "./productivityErrorMessages";

/**
 * Mismo contrato que `verifyVacationEstado`:
 * - `ok`: sigue en el estado esperado; se puede escribir.
 * - `stale`: cambió de estado o ya no existe. No se escribe; ya se avisó y se
 *   invalidó el listado. El llamador cierra su diálogo.
 * - `error`: no se pudo comprobar (red, 5xx). No se escribe (falla CERRADO); ya
 *   se avisó. El llamador deja el diálogo abierto para reintentar.
 */
export type ProductivityEstadoCheck = "ok" | "stale" | "error";

/**
 * Guarda previa a editar, confirmar, devolver a borrador o eliminar. El
 * backend no protege `estado` en ninguna escritura (no hay transiciones), así
 * que la única defensa contra una caché vieja es leer el registro FRESCO
 * justo antes.
 *
 * Llama al servicio directamente, nunca a una consulta de TanStack: tiene que
 * ser una petición de red cada vez.
 */
export const verifyProductivityEstado = async (
  queryClient: QueryClient,
  id: number,
  expected: EstadoProductividad
): Promise<ProductivityEstadoCheck> => {
  let fresh: Productivity | null = null;
  try {
    fresh = await getProductivityRecord(id);
  } catch (error) {
    if (!isNotFoundError(error)) {
      console.error(error);
      toast.error(PRODUCTIVITY_CHECK_FAILED_MESSAGE);
      return "error";
    }
  }

  if (fresh && fresh.estado === expected) {
    return "ok";
  }
  toast.error(fresh ? productivityEstadoChangedMessage(fresh.estado) : PRODUCTIVITY_GONE_MESSAGE);
  void queryClient.invalidateQueries({ queryKey: PRODUCTIVITY_KEY });
  return "stale";
};
