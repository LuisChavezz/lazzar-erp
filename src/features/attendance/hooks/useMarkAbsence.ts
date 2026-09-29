import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createAttendance } from "../services/actions";
import type { AttendanceRowTarget } from "../utils/attendanceRowTarget";
import { ATTENDANCE_KEY_ROOT } from "./useAttendance";
import {
  DUPLICATE_ATTENDANCE_MESSAGE,
  handleAttendanceWriteError,
  isNonFieldValidationError,
} from "./attendanceErrorMessages";

export const markAbsenceMutationKey = ["attendance-mark-absence"] as const;

export interface MarkAbsenceVariables {
  target: AttendanceRowTarget;
  /** Turno ACTUAL del empleado: el alta lo exige y el pase de lista lo conoce. */
  turno: number;
}

/**
 * "Marcar falta": alta manual con empleado, turno y fecha, SIN horas. El
 * servidor deriva `estado` = `falta`. Si otra persona ya creó el registro del
 * día, el 400 de unicidad llega como `DUPLICATE_ATTENDANCE_MESSAGE` y el
 * refetch muestra el registro real.
 */
export const useMarkAbsence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: markAbsenceMutationKey,
    mutationFn: ({ target, turno }: MarkAbsenceVariables) =>
      createAttendance({ empleado: target.empleado, turno, fecha: target.fecha }),
    onSuccess: () => {
      toast.success("Falta registrada en el pase de lista");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        isNonFieldValidationError(error)
          ? DUPLICATE_ATTENDANCE_MESSAGE
          : handleAttendanceWriteError(error, "No se pudo marcar la falta. Intenta de nuevo.")
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY_ROOT }),
  });
};
