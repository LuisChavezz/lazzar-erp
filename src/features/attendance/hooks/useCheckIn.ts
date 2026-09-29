import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { registerEntry, registerExit } from "../services/actions";
import type { AttendanceCheckInBody } from "../interfaces/attendance.interface";
import type { AttendanceRowTarget } from "../utils/attendanceRowTarget";
import { ATTENDANCE_KEY_ROOT } from "./useAttendance";
import { checkInErrorMessage } from "./attendanceErrorMessages";

/** Claves de las mutaciones: alimentan el "en vuelo" por fila (`usePendingAttendanceTargets`). */
export const registerEntryMutationKey = ["attendance-register-entry"] as const;
export const registerExitMutationKey = ["attendance-register-exit"] as const;

export interface CheckInVariables {
  target: AttendanceRowTarget;
  /**
   * "YYYY-MM-DD HH:MM:SS" en hora local de México, SOLO para un día pasado.
   * Hoy se omite y el servidor usa su hora actual.
   */
  hora?: string;
}

const toCheckInBody = ({ target, hora }: CheckInVariables): AttendanceCheckInBody => ({
  empleado_id: target.empleado,
  fecha: target.fecha,
  ...(hora ? { hora } : {}),
});

/**
 * `registrar_entrada/`. Sin optimista: el registro (y su estado derivado) lo
 * decide el servidor. Un 409 (ya estaba registrada) muestra el mensaje del
 * backend y el refetch trae la entrada real del día.
 */
export const useRegisterEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: registerEntryMutationKey,
    mutationFn: (variables: CheckInVariables) => registerEntry(toCheckInBody(variables)),
    onSuccess: () => {
      toast.success("Entrada registrada");
    },
    onError: (error) => {
      console.error(error);
      toast.error(checkInErrorMessage(error, "No se pudo registrar la entrada. Intenta de nuevo."));
    },
    // Se devuelve la promesa: la fila sigue "en vuelo" hasta que el listado se
    // refresca, así nunca se ve un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY_ROOT }),
  });
};

/** `registrar_salida/`. Mismo contrato que `useRegisterEntry`. */
export const useRegisterExit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: registerExitMutationKey,
    mutationFn: (variables: CheckInVariables) => registerExit(toCheckInBody(variables)),
    onSuccess: () => {
      toast.success("Salida registrada");
    },
    onError: (error) => {
      console.error(error);
      toast.error(checkInErrorMessage(error, "No se pudo registrar la salida. Intenta de nuevo."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY_ROOT }),
  });
};
