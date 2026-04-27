import { z } from "zod";

// --- Schema de validación para el formulario de redacción de correo ---

export const ComposeEmailFormSchema = z.object({
  to: z
    .string()
    .min(1, "El destinatario es requerido")
    .email("Ingresa un correo electrónico válido"),
  subject: z
    .string()
    .min(1, "El asunto es requerido")
    .max(255, "El asunto no puede superar los 255 caracteres"),
  body: z
    .string()
    .min(1, "El mensaje es requerido"),
});

export type ComposeEmailFormValues = z.infer<typeof ComposeEmailFormSchema>;
