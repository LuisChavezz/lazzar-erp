import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { createCalendar } from "../services/actions";
import { CalendarFormValues } from "../schemas/calendar.schema";

type SetCalendarError = (
  field: keyof CalendarFormValues,
  error: { type?: string; message?: string }
) => void;

/**
 * No inyecta `empresa` desde el workspace —a diferencia de puestos o turnos—
 * porque el backend resuelve el tenant a partir de `turno`. Mismo caso que
 * `useCreateArea`, que lo resuelve a partir de `departamento`.
 */
export const useCreateCalendar = (setError?: SetCalendarError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendars"] });
      toast.success("Día de calendario registrado correctamente");
    },
    onError: (error) => {
      // Mensaje a nivel de objeto, no de campo. Es el que DRF usa para
      // `unique_together`: si `fecha` + `turno` deben ser únicos, el motivo
      // llega aquí y no bajo ninguno de los tres campos del formulario, así que
      // sin esto el usuario solo vería el toast genérico.
      let formError: string | undefined;

      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;
          formError = firstDrfMessage(validationErrors.non_field_errors);

          if (setError) {
            Object.keys(validationErrors).forEach((key) => {
              if (key === "non_field_errors") {
                return;
              }
              const fieldKey = key as keyof CalendarFormValues;
              const errorMessages = validationErrors[key];

              if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                setError(fieldKey, {
                  type: "server",
                  message: errorMessages[0],
                });
              }
            });
          }
        }
      }

      toast.error(formError ?? "Error al registrar el día de calendario");
    },
  });
};
