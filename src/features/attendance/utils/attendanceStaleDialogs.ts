import {
  getStaleRowDialogNotice,
  type StaleEstadoRowDialogMessages,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import { getEstadoAsistenciaLabel, type EstadoAsistencia } from "../constants/attendanceChoices";
import { ATTENDANCE_GONE_MESSAGE } from "../constants/attendanceMessages";
import type { CheckInKind } from "../interfaces/attendance.interface";
import type { AttendanceRow, RollCallRow } from "./attendanceRows";

/**
 * Reglas PURAS de cierre de los diálogos de asistencia por datos obsoletos:
 * la regla genérica de los listados (`getStaleRowDialogNotice`) con los
 * textos y los casos del módulo. Cada diálogo guarda solo el id (o el
 * empleado) y se resuelve contra el listado COMPLETO de la vista, no contra
 * la página filtrada: checar, corregir o justificar cambian `estado` —un
 * filtro— y la fila puede salir de la vista sin que su diálogo deba cerrarse.
 *
 * En todas, `canResolve` es `false` mientras el listado no corresponde al día
 * o periodo actual (cargando o con `placeholderData`): ahí la ausencia de una
 * fila no significa nada, así que el diálogo sigue.
 */

/** Textos del aviso de un diálogo sobre un registro que se cerró por un cambio externo. */
export const ATTENDANCE_STALE_MESSAGES: StaleEstadoRowDialogMessages<EstadoAsistencia> = {
  gone: ATTENDANCE_GONE_MESSAGE,
  estadoChanged: (estado) =>
    `El registro cambió de estado (ahora: «${
      getEstadoAsistenciaLabel(estado) ?? estado
    }»). Se actualizó el listado.`,
};

/**
 * ¿El diálogo sobre un registro existente (desglose, corregir, justificar,
 * eliminar) ya no aplica? Sin `expectedEstado`, solo cuenta que el registro
 * desaparezca (otra persona lo borró). Con `expectedEstado` —justificar o
 * quitar la justificación, con el estado con que se ABRIÓ la confirmación—,
 * también que su estado cambie: el texto de la confirmación nombra ese
 * estado. Mientras la mutación propia está en vuelo (`isBusy`) no aplica: la
 * cierra su propio flujo. `null` = el diálogo sigue.
 */
export const getStaleAttendanceRecordNotice = (args: {
  targetId: number | null;
  target: AttendanceRow | null;
  expectedEstado?: EstadoAsistencia;
  isBusy: boolean;
  canResolve: boolean;
}): StaleRowDialogNotice | null => {
  const { targetId, target, expectedEstado, canResolve } = args;
  const isBusy = args.isBusy || !canResolve;
  return expectedEstado !== undefined
    ? getStaleRowDialogNotice({
        resource: "attendance",
        targetId,
        target,
        expectedEstado,
        isBusy,
        messages: ATTENDANCE_STALE_MESSAGES,
      })
    : getStaleRowDialogNotice({
        resource: "attendance",
        targetId,
        target,
        isBusy,
        messages: { gone: ATTENDANCE_STALE_MESSAGES.gone },
      });
};

/**
 * ¿La checada pedida sigue aplicando a la fila del pase de lista? Entrada:
 * el empleado sigue sin registro ese día. Salida: tiene entrada y no salida.
 */
export const checkInApplies = (kind: CheckInKind, row: RollCallRow | null): boolean => {
  if (!row) return false;
  if (kind === "entrada") return row.record === null;
  return row.record !== null && row.record.hora_entrada !== null && row.record.hora_salida === null;
};

/** Aviso de la checada con hora que se cerró porque el registro del día cambió. */
export const CHECK_IN_STALE_MESSAGE =
  "El registro del día cambió mientras capturabas la hora. Se actualizó el pase de lista.";

/**
 * ¿El diálogo de checada con hora (día pasado) ya no aplica? La fila del pase
 * de lista se identifica por el empleado (puede no tener registro todavía).
 * Se cierra si un refetch muestra que la checada ya no aplica —otra persona
 * registró la entrada o borró el registro, o el empleado ya no está en el
 * pase de lista—: para la regla genérica, la fila "desapareció". Una fila que
 * solo sale de la vista FILTRADA (p. ej. por estado, justo después de checar)
 * sigue en el listado completo y no cuenta. Mientras su propia checada está
 * en vuelo (`isBusy`) no aplica. `null` = el diálogo sigue.
 */
export const getStaleCheckInNotice = (args: {
  kind: CheckInKind;
  empleado: number | null;
  row: RollCallRow | null;
  isBusy: boolean;
  canResolve: boolean;
}): StaleRowDialogNotice | null =>
  getStaleRowDialogNotice({
    resource: "attendance-checkin",
    targetId: args.empleado,
    target: checkInApplies(args.kind, args.row) ? args.row : null,
    isBusy: args.isBusy || !args.canResolve,
    messages: { gone: CHECK_IN_STALE_MESSAGE },
  });
