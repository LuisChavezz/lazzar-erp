import { z } from "zod";

export const ColorFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo: z
    .string()
    .trim()
    .min(1, "El código es requerido")
    .max(3, "El código admite máximo 3 caracteres"),
  // Sin `#`: el formulario lo guarda así y `toApiHex` lo añade al enviar.
  codigo_hex: z
    .string()
    .min(3, "El código HEX debe tener 3 o 6 caracteres")
    .regex(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "El código HEX es inválido"),
});

export type ColorFormValues = z.infer<typeof ColorFormSchema>;
