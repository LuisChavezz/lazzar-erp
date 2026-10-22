import { z } from "zod";

/**
 * Formulario del diálogo "Enviar CFDI". El correo es OBLIGATORIO aunque el
 * backend tenga uno por defecto: se manda siempre el que el usuario confirmó
 * (precargado con `correo_facturas`). Una sola dirección, como valida el
 * backend (`validate_email`). Se recorta antes de validar.
 */
export const SendInvoiceCfdiFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Escribe el correo de destino.")
    .email("Escribe un correo válido (una sola dirección)."),
});

export type SendInvoiceCfdiFormValues = z.infer<typeof SendInvoiceCfdiFormSchema>;
