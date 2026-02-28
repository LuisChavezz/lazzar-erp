import { z } from "zod";

export const ColorFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo_hex: z
    .string()
    .min(3, "El código HEX debe tener 3 o 6 caracteres")
    .regex(/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "El código HEX es inválido"),
});

export type ColorFormValues = z.infer<typeof ColorFormSchema>;
