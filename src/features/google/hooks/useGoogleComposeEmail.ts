"use client";

import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";
import { googleSendEmail } from "../services/actions";
import type { ComposeEmailFormValues } from "../schemas/google-email.schema";
import type { GoogleSendEmailResponse } from "../interfaces/google.interface";

// --- Utilidad para extraer el mensaje de error ---

const extractErrorMessage = (error: unknown, fallback: string): string => {
  const axiosData = (error as AxiosError<{ error?: string }>)?.response?.data;
  if (axiosData?.error) return axiosData.error;
  if (error instanceof Error) return error.message;
  return fallback;
};

// --- Hook ---

/**
 * Mutación para enviar un correo electrónico libre (redactado por el usuario).
 *
 * Distinto de `useGoogleSendEmail`, que envía el PDF de una cotización con
 * contenido generado por el servidor. Este hook envía exclusivamente los campos
 * `to`, `subject` y `body` proporcionados por el formulario, sin HTML adicional.
 */
export const useGoogleComposeEmail = () =>
  useMutation<GoogleSendEmailResponse, unknown, ComposeEmailFormValues>({
    mutationKey: ["google", "compose-email"],
    mutationFn: ({ to, subject, body }: ComposeEmailFormValues) =>
      googleSendEmail({ to, subject, body }),
    onSuccess: () => {
      toast.success("Correo enviado correctamente");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo enviar el correo."));
    },
  });
