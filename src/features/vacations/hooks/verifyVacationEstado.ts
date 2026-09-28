import { AxiosError } from "axios";
import type { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getVacation, getVacationsByEmployee } from "../services/actions";
import type { EstadoVacacion } from "../constants/vacationChoices";
import type { Vacation } from "../interfaces/vacation.interface";
import { getFechaFinError, type VacationFormValues } from "../schemas/vacation.schema";
import { VACATIONS_KEY } from "./useVacations";
import {
  VACATION_CHECK_FAILED_MESSAGE,
  VACATION_GONE_MESSAGE,
  vacationEstadoChangedMessage,
} from "./vacationErrorMessages";

/**
 * - `ok`: el registro sigue en el estado esperado; se puede escribir.
 * - `stale`: cambió de estado o ya no existe. No se escribe; ya se avisó y se
 *   invalidó el listado. El llamador cierra su diálogo.
 * - `error`: no se pudo comprobar (red, 5xx). No se escribe (falla CERRADO); ya
 *   se avisó. El llamador deja el diálogo abierto para reintentar.
 */
export type VacationEstadoCheck = "ok" | "stale" | "error";

const is404 = (error: unknown) => error instanceof AxiosError && error.response?.status === 404;

/** Aviso de falla de la guarda: nunca el texto crudo de Axios. */
const reportCheckFailure = (error: unknown): "error" => {
  console.error(error);
  toast.error(VACATION_CHECK_FAILED_MESSAGE);
  return "error";
};

/**
 * Compara un registro FRESCO (o `null` si ya no existe) con el estado con que se
 * abrió el diálogo. Si no coincide avisa, invalida el listado y devuelve
 * `stale`.
 */
const compareFreshEstado = (
  queryClient: QueryClient,
  fresh: Vacation | null,
  expected: EstadoVacacion
): VacationEstadoCheck => {
  if (fresh && fresh.estado === expected) {
    return "ok";
  }
  toast.error(fresh ? vacationEstadoChangedMessage(fresh.estado) : VACATION_GONE_MESSAGE);
  void queryClient.invalidateQueries({ queryKey: VACATIONS_KEY });
  return "stale";
};

/**
 * Guarda previa a un DELETE: el backend NO protege `estado` en esa escritura
 * (borrar una rechazada responde 204), así que la única defensa es leer el
 * registro FRESCO justo antes.
 *
 * Llama al servicio directamente, nunca a una consulta de TanStack: tiene que
 * ser una petición de red cada vez. La caché puede llevar minutos vieja (sin
 * refetch al enfocar) mientras otra persona aprobaba o rechazaba.
 */
export const verifyVacationEstado = async (
  queryClient: QueryClient,
  id: number,
  expected: EstadoVacacion
): Promise<VacationEstadoCheck> => {
  try {
    return compareFreshEstado(queryClient, await getVacation(id), expected);
  } catch (error) {
    return is404(error) ? compareFreshEstado(queryClient, null, expected) : reportCheckFailure(error);
  }
};

/**
 * Resultado de la guarda previa al alta o a la edición: los de
 * `VacationEstadoCheck` más `overlap`, con el mensaje de la regla de traslape
 * (el mismo del schema) para pintarlo bajo `fecha_fin`. En `overlap` ya se
 * invalidó el listado; el diálogo queda abierto con lo capturado.
 */
export type VacationWriteCheck =
  | { result: VacationEstadoCheck }
  | { result: "overlap"; message: string };

/**
 * Guarda previa al POST (alta) y al PATCH (edición), contra datos FRESCOS del
 * servidor. El backend no valida traslapes ni protege `estado` en el PATCH.
 *
 * Un solo flujo, en este orden:
 *
 * 1. `GET /hr/vacaciones/?empleado={id}`: las solicitudes vigentes del
 *    empleado elegido (sin caché).
 * 2. Solo en edición, el estado: si la solicitud editada viene en esa misma
 *    respuesta (lo normal: no se cambió de empleado) se toma de ahí, sin otra
 *    petición. Si no viene —se eligió otro empleado, o alguien la borró o le
 *    cambió el empleado— se pide `GET /{id}/` para distinguir "ya no existe"
 *    (404) de "sigue, con otro empleado". El estado va ANTES que el traslape:
 *    si ya no está pendiente, el diálogo se cierra sin importar las fechas.
 * 3. El traslape, con la MISMA regla del schema (`getFechaFinError`: cuentan
 *    pendientes y aprobadas, no rechazadas, y se excluye la editada).
 *
 * Falla cerrado: cualquier GET fallido (salvo el 404 del paso 2) devuelve
 * `error` y no se escribe.
 */
export const preflightVacationWrite = async (
  queryClient: QueryClient,
  values: Pick<VacationFormValues, "empleado" | "fecha_inicio" | "fecha_fin">,
  editingId: number | null,
  expectedEstado: EstadoVacacion
): Promise<VacationWriteCheck> => {
  let employeeVacations: Vacation[];
  try {
    employeeVacations = await getVacationsByEmployee(values.empleado);
  } catch (error) {
    return { result: reportCheckFailure(error) };
  }

  if (editingId !== null) {
    let fresh = employeeVacations.find((vacation) => vacation.id === editingId) ?? null;
    if (!fresh) {
      try {
        fresh = await getVacation(editingId);
      } catch (error) {
        if (!is404(error)) {
          return { result: reportCheckFailure(error) };
        }
      }
    }
    const estadoCheck = compareFreshEstado(queryClient, fresh, expectedEstado);
    if (estadoCheck !== "ok") {
      return { result: estadoCheck };
    }
  }

  const overlapMessage = getFechaFinError(values, { vacations: employeeVacations, editingId });
  if (overlapMessage) {
    void queryClient.invalidateQueries({ queryKey: VACATIONS_KEY });
    return { result: "overlap", message: overlapMessage };
  }
  return { result: "ok" };
};
