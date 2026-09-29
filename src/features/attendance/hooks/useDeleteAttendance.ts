import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteAttendance } from "../services/actions";
import type { AttendanceRowTarget } from "../utils/attendanceRowTarget";
import { ATTENDANCE_KEY_ROOT } from "./useAttendance";
import { attendanceActionErrorMessage } from "./attendanceErrorMessages";

export const deleteAttendanceMutationKey = ["attendance-delete"] as const;

export interface DeleteAttendanceVariables {
  target: AttendanceRowTarget & { id: number };
}

/**
 * Borrado físico. A diferencia de los catálogos, SIN optimista: aquí el 409
 * (un `ControlHoras` depende del registro) es un resultado esperado, y sacar
 * la fila para devolverla un instante después mentiría. La confirmación queda
 * abierta y bloqueada hasta que el servidor responde; el 409 muestra el
 * `detail` del backend.
 */
export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deleteAttendanceMutationKey,
    mutationFn: ({ target }: DeleteAttendanceVariables) => deleteAttendance(target.id),
    onSuccess: () => {
      toast.success("Registro de asistencia eliminado");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        attendanceActionErrorMessage(error, "No se pudo eliminar el registro de asistencia.")
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_KEY_ROOT }),
  });
};
