import type { QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type {
  CalendarOccupancySource,
  CalendarOccupant,
} from "@/src/interfaces/hr-calendar.interface";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getAbsence, getAbsencesByEmployee } from "../services/actions";
import type { EstadoAusencia } from "../constants/absenceChoices";
import type { Absence } from "../interfaces/absence.interface";
import { getFechaFinError, type AbsenceFormValues } from "../schemas/absence.schema";
import { ABSENCES_KEY } from "./useAbsences";
import {
  ABSENCE_CHECK_FAILED_MESSAGE,
  ABSENCE_OVERLAP_CHECK_FAILED_MESSAGE,
  ABSENCE_GONE_MESSAGE,
  absenceEstadoChangedMessage,
} from "./absenceErrorMessages";

/**
 * Mismo contrato que `verifyVacationEstado`:
 * - `ok`: sigue en el estado esperado; se puede escribir.
 * - `stale`: cambió de estado o ya no existe; ya se avisó e invalidó. Cerrar.
 * - `error`: no se pudo comprobar (red, 5xx); falla CERRADO, ya se avisó.
 */
export type AbsenceEstadoCheck = "ok" | "stale" | "error";

const reportCheckFailure = (
  error: unknown,
  message: string = ABSENCE_CHECK_FAILED_MESSAGE
): "error" => {
  console.error(error);
  toast.error(message);
  return "error";
};

const compareFreshEstado = (
  queryClient: QueryClient,
  fresh: Absence | null,
  expected: EstadoAusencia
): AbsenceEstadoCheck => {
  if (fresh && fresh.estado === expected) {
    return "ok";
  }
  toast.error(fresh ? absenceEstadoChangedMessage(fresh.tipo, fresh.estado) : ABSENCE_GONE_MESSAGE);
  void queryClient.invalidateQueries({ queryKey: ABSENCES_KEY });
  return "stale";
};

/**
 * Guarda previa a un DELETE: el backend borra en cualquier estado, así que se
 * lee el registro FRESCO (sin caché) justo antes.
 */
export const verifyAbsenceEstado = async (
  queryClient: QueryClient,
  id: number,
  expected: EstadoAusencia
): Promise<AbsenceEstadoCheck> => {
  try {
    return compareFreshEstado(queryClient, await getAbsence(id), expected);
  } catch (error) {
    return isNotFoundError(error)
      ? compareFreshEstado(queryClient, null, expected)
      : reportCheckFailure(error);
  }
};

export type AbsenceWriteCheck =
  | { result: AbsenceEstadoCheck }
  | { result: "overlap"; message: string };

/**
 * Guarda previa al POST y al PATCH contra datos FRESCOS del servidor. Mismo
 * flujo que `preflightVacationWrite`:
 *
 * 1. En paralelo, `GET /hr/permisos-ausencias/?empleado={id}` y la ocupación
 *    del empleado en los OTROS recursos (vacaciones) a través de sus fuentes
 *    (`foreignSources`, repartidas por el hub de RH). Todo sin caché.
 * 2. Solo en edición, el estado: de la primera respuesta si el registro viene
 *    en ella; si no, `GET /{id}/` para distinguir un 404. Va ANTES que el
 *    traslape: si ya no está pendiente, se cierra sin importar las fechas.
 * 3. Las reglas de `fecha_fin` del schema (orden, falta futura, traslape con
 *    permisos y con vacaciones) contra esos datos frescos.
 *
 * Falla CERRADO (D3): si cualquier GET falla, no se escribe. Mientras la guarda
 * está en curso el formulario está deshabilitado; solo un "sin conflicto"
 * confirmado deja escribir.
 */
export const preflightAbsenceWrite = async (
  queryClient: QueryClient,
  values: Pick<AbsenceFormValues, "empleado" | "tipo" | "fecha_inicio" | "fecha_fin">,
  editingId: number | null,
  expectedEstado: EstadoAusencia,
  foreignSources: readonly CalendarOccupancySource[]
): Promise<AbsenceWriteCheck> => {
  // En paralelo, pero con su propio fallo: si cae la consulta de los OTROS
  // recursos, el aviso dice que lo no verificado fue el traslape.
  const [ownResult, foreignResult] = await Promise.allSettled([
    getAbsencesByEmployee(values.empleado),
    Promise.all(foreignSources.map((source) => source.fetchByEmployee(values.empleado))),
  ]);
  if (ownResult.status === "rejected") {
    return { result: reportCheckFailure(ownResult.reason) };
  }
  if (foreignResult.status === "rejected") {
    return { result: reportCheckFailure(foreignResult.reason, ABSENCE_OVERLAP_CHECK_FAILED_MESSAGE) };
  }
  const employeeAbsences: Absence[] = ownResult.value;
  const foreignOccupants: CalendarOccupant[] = foreignResult.value.flat();

  if (editingId !== null) {
    let fresh = employeeAbsences.find((absence) => absence.id === editingId) ?? null;
    if (!fresh) {
      try {
        fresh = await getAbsence(editingId);
      } catch (error) {
        if (!isNotFoundError(error)) {
          return { result: reportCheckFailure(error) };
        }
      }
    }
    const estadoCheck = compareFreshEstado(queryClient, fresh, expectedEstado);
    if (estadoCheck !== "ok") {
      return { result: estadoCheck };
    }
  }

  const message = getFechaFinError(values, {
    absences: employeeAbsences,
    editingId,
    foreignOccupants,
  });
  if (message) {
    void queryClient.invalidateQueries({ queryKey: ABSENCES_KEY });
    return { result: "overlap", message };
  }
  return { result: "ok" };
};
