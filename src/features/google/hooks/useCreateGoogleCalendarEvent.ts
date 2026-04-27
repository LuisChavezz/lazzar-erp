"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";
import { createGoogleCalendarEvent } from "../services/actions";
import type { GoogleCalendarEventCreate } from "../interfaces/google.interface";

// --- Utilidad para extraer el mensaje de error ---

const extractErrorMessage = (error: unknown, fallback: string): string => {
  const axiosData = (error as AxiosError<{ error?: string }>)?.response?.data;
  if (axiosData?.error) return axiosData.error;
  if (error instanceof Error) return error.message;
  return fallback;
};

// --- Hook ---

/**
 * Mutación para crear un evento en Google Calendar.
 *
 * Invalida automáticamente la query de eventos del calendario tras el éxito
 * para que el calendario refleje el nuevo evento sin recargar la página.
 */
export const useCreateGoogleCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation<{ ok: boolean }, unknown, GoogleCalendarEventCreate>({
    mutationKey: ["google", "calendar", "create-event"],
    mutationFn: createGoogleCalendarEvent,
    onSuccess: () => {
      toast.success("Evento creado en Google Calendar");
      queryClient.invalidateQueries({ queryKey: ["google", "calendar", "events"] });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo crear el evento."));
    },
  });
};
